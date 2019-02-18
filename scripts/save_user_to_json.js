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

const searchId = process.argv[2];

const promises = [getUserById(searchId)];
Promise.all(promises).then(users => {
  fs.writeFileSync('./my_user.json', JSON.stringify(users[0]), 'utf8');
  console.log(searchId+' written to my_user.json')
  redisClient.quit();
  setTimeout(() => {
    process.exit(0)
  }, 3000);
})
.catch(console.log);
