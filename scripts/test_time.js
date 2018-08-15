// NOTE: this script is just a performance test of the new method vs the old method of persisting users
// This script tests changing a single user, which is the usual change case

const constants = require('../src/constants');

const { DB_USERS, DB_USER_LIST } = constants;

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
const getLAsync = promisify(redisClient.lrange).bind(redisClient);
var iterations = 10000;
console.time('Function #1');
for(var i = 0; i < iterations; i++ ){
  getAsync(DB_USERS).then(res => {
    const users = JSON.parse(res);
    redisClient.set('users', users.map(user => user.id = user.id));
  });
}
console.timeEnd('Function #1');

console.time('Function #2');
for(var i = 0; i < iterations; i++ ){
  getLAsync(DB_USER_LIST).then(res => {
    res.forEach(id => {
      getAsync(id).then(user => {
        user.id = user.id
        redisClient.set(`user:${id}`, user);
      });
    })
    redisClient.quit();
  });
}
console.timeEnd('Function #2')
setTimeout(() => process.exit(), 10000)
// process.exit();
