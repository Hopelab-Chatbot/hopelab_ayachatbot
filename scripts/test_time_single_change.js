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
setTimeout(() => {console.log('exiting early at 10s');process.exit()}, 10000)

var iterations = 100000;
console.time('Function #1');
for(var i = 0; i < iterations; i++ ){
  getAsync(DB_USERS).then(res => {
    const users = JSON.parse(res);
    const newUsers = users.map((user, i) => {
      if (i === users.length - 1) {console.log('modded one user');user.history = history};
      return user;
    });
    redisClient.set('users', newUsers);
    redisClient.quit();
  });
}
console.timeEnd('Function #1');
setTimeout(() => {
  console.time('Function #2');
  for(var i = 0; i < iterations; i++ ){
    getLAsync(DB_USER_LIST, -1).then(id => {
      getAsync(id).then(user => {
        user.history = user.history
        console.log('modded one user');
        redisClient.set(`user:${id}`, user);
      });
      redisClient.quit();
    });
  }
  console.timeEnd('Function #2')
}, 3000)
// process.exit();
