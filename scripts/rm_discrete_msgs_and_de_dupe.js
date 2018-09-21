const R =require('ramda');
const constants = require('../src/constants');
const { keyFormatMessageId } = require('../src/utils/msg_utils');
const { DB_MESSAGE_LIST, DB_MESSAGES } = constants;
const { getMessageById } = require('../src/database');


const {promisify} = require('util');

let redis = require('redis');

const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});


const getLAsync = promisify(redisClient.lrange).bind(redisClient);

getLAsync(DB_MESSAGE_LIST, 0, -1).then(msgIds => {
  if (!msgIds || msgIds.length === 0) {
    console.log('no messages to reset to message key')
    redisClient.quit();
  } else {
    const promises = msgIds.map(id => {
      return getMessageById(id);
    });
    Promise.all(promises).then(msgs => {
      if (msgs && msgs.length > 0 && msgs[0]) {
        console.log(msgs.length)
        const uniqueMsgs = R.uniq(msgs);
        console.log(uniqueMsgs.length)
        redisClient.set(DB_MESSAGES, JSON.stringify(uniqueMsgs));
        redisClient.del(DB_MESSAGE_LIST);
        uniqueMsgs.forEach(({id = ''}, i) => {
          redisClient.del(keyFormatMessageId(id));
          // NOTE: this is an artifact from the old script that was run as a mistake
          redisClient.del(`msg:${id}`);
          if (i === uniqueMsgs.length - 1) {
            console.log('deleted ' + uniqueMsgs.length * 2 + ' individual message keys');
          }
        });
      }
    })
      .catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
  }
}).catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
