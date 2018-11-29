// NOTE: this script gets all messages just for running jsperf scripts

const constants = require('../src/constants');
var fs = require('fs');
const { getMessageById } = require('../src/database');

const { DB_MESSAGE_LIST } = constants;

const {promisify} = require('util');

const redis = require('redis');

const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});


const getLAsync = promisify(redisClient.lrange).bind(redisClient);


getLAsync(DB_MESSAGE_LIST, 0, -1).then(msgIds => {
  const promises = msgIds.map(id => {
    return getMessageById(id);
  });
  Promise.all(promises).then(msgs => {
    fs.writeFileSync('./messages.json', JSON.stringify(msgs), 'utf8');
    redisClient.quit();
    setTimeout(() => {
      process.exit(0)
    }, 3000);
  })
  .catch(console.log);
}).catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
