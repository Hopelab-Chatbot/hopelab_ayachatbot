// NOTE: this script breaks the large JSON string of messages into discrete msg keys for better
// performance, storage, and debug ability.

const constants = require('../src/constants');
const { keyFormatMessageId } = require('../src/utils/msg_utils');
const { DB_MESSAGE_LIST, DB_MESSAGES } = constants;


const {promisify} = require('util');

let redis = require('redis');

const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});


const getAsync = promisify(redisClient.get).bind(redisClient);

getAsync(DB_MESSAGES).then(res => {
  const json_msgs = JSON.parse(res);
  const length = json_msgs.length;
  json_msgs.forEach((msg, i) => {
    const { id } = msg;
    redisClient.lpush(DB_MESSAGE_LIST, id);
    redisClient.set(keyFormatMessageId(id), JSON.stringify(msg));
    if (i === json_msgs.length - 1) {
      console.log('rewrote ' + length + ' messages');// eslint-disable-line no-console
      redisClient.quit();
      setTimeout(() => {
        process.exit(0);
      }, 3000);
    }
  });
}).catch(err => {console.log(err); process.exit(1);}); // eslint-disable-line no-console
