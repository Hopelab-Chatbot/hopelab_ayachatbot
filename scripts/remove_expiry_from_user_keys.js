// NOTE: This script removes expiry from user:xxxx keys for our own 'archiving'

const constants = require('../src/constants');
const { getUserById, keyFormatUserId } = require('../src/database');

const { DB_USER_LIST } = constants;

const {promisify} = require('util');

const redis = require('redis');
const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

const getLAsync = promisify(redisClient.lrange).bind(redisClient);
let num = 0;
getLAsync(DB_USER_LIST, 0, -1).then(userIds => {
  if (!userIds || userIds.length === 0) {
    redisClient.quit();
    setTimeout(() => {
      process.exit(0);
    }, 3000);
  } else {
    const promises = userIds.map(id => {
      return getUserById(id);
    });
    Promise.all(promises).then(users => {
      const userUpdatePromises = [];
      users.forEach(user => {
        if (!user || !user.history.length) {
          redisClient.lrem(DB_USER_LIST, 0, user.id);
        } else {
          num++;
          userUpdatePromises.push(redisClient.persist(keyFormatUserId(user.id)));
        }
      });
      Promise.all(userUpdatePromises).then(() => {
        console.log(num + ' users have been persisted');
        setTimeout(() => {
          redisClient.quit();
          process.exit(0);
        }, 3000);
      })
        .catch(console.error);
    })
      .catch(err => console.log(err));// eslint-disable-line no-console
  }
}).catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
