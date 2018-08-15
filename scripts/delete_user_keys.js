// NOTE: This script will delete individual user keys, and delete the list of user ids.
// It will seed the 'users' JSON array

const constants = require('../src/constants');
const { keyFormatUserId } = require('../src/database');

const { DB_USER_LIST } = constants;

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
const getAsync = promisify(redisClient.get).bind(redisClient);

getLAsync(DB_USER_LIST, 0, -1).then(userIds => {
  const users = []
  userIds.forEach((id, i) => {
    getAsync(keyFormatUserId(id)).then(user => {
      users.push(user);
      redisClient.del(keyFormatUserId(id));
      if (i === userIds.length - 1 ) {
        redisClient.set('users', users);
        redisClient.del(DB_USER_LIST);
        redisClient.quit();
        setTimeout(() => {
          process.exit(0)
        }, 3000);
      }
    }).catch(err => {console.log(err);process.exit(1);});
  });
}).catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
