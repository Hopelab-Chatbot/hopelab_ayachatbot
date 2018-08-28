// NOTE: this script gets the largest user key. It is useful if you think there may be a bot
// trying to spam our bot. This script will write to a file to easily inspect the object.

const constants = require('../src/constants');
var fs = require('fs');
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
  const promises = userIds.map(id => {
    return getUserById(id);
  });
  Promise.all(promises).then(users => {
    let lgst = '';
    let length = 0
    let json = ''
    users.forEach(user => {
      if (JSON.stringify(user).length > length) {
        length = JSON.stringify(user).length;
        lgst = user.id
        json = user
      }
    })
    fs.writeFileSync('./largestuser.json', JSON.stringify(json), 'utf8');
    console.log('the largest user is ' + lgst)
    console.log('with ' + length + ' long string')
    redisClient.quit();
    setTimeout(() => {
      process.exit(0)
    }, 3000);
  })
  .catch(console.log);
}).catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
