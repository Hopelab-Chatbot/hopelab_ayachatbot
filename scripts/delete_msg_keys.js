const constants = require('../src/constants');

const { DB_MESSAGE_LIST } = constants;

const {promisify} = require('util');

const redis = require('redis');

const config = {
  redis: {
    host: '127.0.0.1',
    port: 6379
  }
};

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

const getLAsync = promisify(redisClient.lrange).bind(redisClient);

getLAsync(DB_MESSAGE_LIST, 0, 10000).then(msgIds => {
  msgIds.forEach(id => {
    redisClient.del(`msg:${id}`);
  });
  redisClient.del(DB_MESSAGE_LIST);
  redisClient.quit();
}).catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
