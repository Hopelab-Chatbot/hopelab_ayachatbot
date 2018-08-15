// NOTE: this script gets the largest user key. It is useful if you think there may be a bot
// trying to spam our bot. This script will write to a file to easily inspect the object.

const constants = require('../src/constants');
var fs = require('fs');

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

let lgst = '';
let length = 0
let json = ''
getLAsync(DB_USER_LIST, 0, 2000).then(userIds => {
  userIds.forEach((id, i) => {
    getAsync(`user:${id}`).then(user => {
      if (user.length > length) {
        length = user.length;
        lgst = id
        json = user
      }

      if ((userIds.length - 1) === i){
        fs.writeFileSync('./largestuser.json', json, 'utf8');
        console.log('the largest user is ' + lgst)
        console.log('with ' + length + ' long string')
      }
    });

  });

  redisClient.quit();
}).catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
