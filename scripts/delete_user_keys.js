// NOTE: This script will delete individual user keys, and delete the list of user ids.
// It will seed the 'users' JSON array

const constants = require('../src/constants');
const { keyFormatUserId, getUserById } = require('../src/database');

const { DB_USER_LIST } = constants;

const {promisify} = require('util');

const redis = require('redis');
const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});


const getLAsync = promisify(redisClient.lrange).bind(redisClient);

getLAsync(DB_USER_LIST, 0, -1).then(userIds => {
  if (!userIds || userIds.length === 0) {
    console.log('no users to reset to user key')
    redisClient.quit();
    setTimeout(() => {
      process.exit(0)
    }, 3000);
  } else {
    const promises = userIds.map(id => {
      return getUserById(id);
    });
    Promise.all(promises).then(users => {
      redisClient.set('users', JSON.stringify(users));
      redisClient.del(DB_USER_LIST);
      users.forEach(({id}) => redisClient.del(keyFormatUserId(id)))
      console.log('deleted ' + promises.length + ' individual user keys')
      redisClient.quit();
      setTimeout(() => {
        process.exit(0)
      }, 3000);
    })
    .catch(err => console.log(err));// eslint-disable-line no-console
  }
}).catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
