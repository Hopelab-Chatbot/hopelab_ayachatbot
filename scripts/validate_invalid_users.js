// NOTE: This script determines if the user has completed the intro conversatiom,
// and sets the corresponding value to true in the user object so they will get push notifications

const constants = require('../src/constants');
const { getUserById, updateUser } = require('../src/database');
const { isInvalidUser } = require('../src/utils/user_utils');

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
let userNum = 0;
getLAsync(DB_USER_LIST, 0, -1).then(userIds => {
  if (!userIds || userIds.length === 0) {
    console.log('no users to modify')
    redisClient.quit();
    setTimeout(() => {
      process.exit(0)
    }, 3000);
  } else {
    userNum = userIds.length;
    const promises = userIds.map(id => {
      return getUserById(id);
    });
    Promise.all(promises).then(users => {
      const userUpdatePromises = [];
      users.forEach(user => {
        if (isInvalidUser(user)) {
          const updatedUser = Object.assign({}, user, {invalidUser: false});
          userUpdatePromises.push(updateUser(updatedUser));
          num ++;
        }
      });
      Promise.all(userUpdatePromises).then(() => {
        console.log(num + ' users have been reset to valid out of ' + userNum);
        redisClient.quit();
        setTimeout(() => {
          process.exit(0);
        }, 3000);
      })
        .catch(console.error);
    })
      .catch(err => console.log(err));// eslint-disable-line no-console
  }
}).catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
