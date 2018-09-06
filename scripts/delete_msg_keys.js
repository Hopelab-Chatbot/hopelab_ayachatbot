// NOTE: This script will delete individual message keys, and delete the list of message ids

const constants = require('../src/constants');

const { DB_MESSAGE_LIST, DB_MESSAGES } = constants;

const { keyFormatMessageId } = require('../src/utils/msg_utils');
const { getMessageById } = require('../src/database');

const {promisify} = require('util');

const redis = require('redis');

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
    setTimeout(() => {
      process.exit(0)
    }, 3000);
  } else {
    const promises = msgIds.map(id => {
      return getMessageById(id);
    });
    Promise.all(promises).then(msgs => {
      if (msgs && msgs.length > 0 && msgs[0]) {
        redisClient.set(DB_MESSAGES, JSON.stringify(msgs));
        redisClient.del(DB_MESSAGE_LIST);
        msgs.forEach(({id = ''}, i) => {
          redisClient.del(keyFormatMessageId(id))
          if (i === msgs.length - 1) {
            console.log('deleted ' + promises.length + ' individual message keys');
            redisClient.quit();
            setTimeout(() => {
              process.exit(0);
            }, 3000);
          }
        });
      }
    })
      .catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
  }
}).catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
