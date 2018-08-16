// NOTE: this script renames the 'users' JSON string to 'users_bkp' in order to test that there is no
// code using the old 'users' string
const constants = require('../src/constants');

const { DB_USERS } = constants;

const {promisify} = require('util');

let redis = require('redis');

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

const getAsync = promisify(redisClient.get).bind(redisClient);
getAsync(DB_USERS).then(res => {
  redisClient.set(`users_bkp`, JSON.stringify(res));
  redisClient.expire(DB_USERS, 1);
  redisClient.quit();
});
