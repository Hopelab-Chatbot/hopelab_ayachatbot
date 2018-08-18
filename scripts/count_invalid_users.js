// NOTE: This script determines if the user has completed the intro conversatiom,
// and sets the corresponding value to true in the user object so they will get push notifications

const constants = require('../src/constants');
const { getUserById } = require('../src/database');
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
    const promises = userIds.map(id => {
      return getUserById(id);
    });
    Promise.all(promises).then(users => {
      users.forEach(user => {
        userNum ++;
        if (isInvalidUser(user)) {
          num++;
        }
      });
      console.log(num + ' users to have become invalid out of ' + userNum);
      redisClient.quit();
      setTimeout(() => {
        process.exit(0);
      }, 3000);
    })
      .catch(err => console.log(err));// eslint-disable-line no-console
  }
}).catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
