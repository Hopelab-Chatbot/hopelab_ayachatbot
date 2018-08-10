const constants = require('../src/constants');
const { keyFormatUserId } = require('../src/users');

const { DB_USER_LIST, EXPIRE_USER_AFTER, SECONDS_EXPIRE_ARG } = constants;

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

getAsync("users").then(res => {
  const json_users = JSON.parse(res);
  const length = json_users.length;
  json_users.forEach(user => {
    const { id } = user;
    redisClient.lpush(DB_USER_LIST, id);
    redisClient.set(keyFormatUserId(id), JSON.stringify(user), SECONDS_EXPIRE_ARG, EXPIRE_USER_AFTER);
  });
  console.log('rewrote ' + length + ' users');// eslint-disable-line no-console

  redisClient.quit();
}).catch(err => {console.log(err); process.exit(1);}); // eslint-disable-line no-console
