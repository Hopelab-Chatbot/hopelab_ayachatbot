// NOTE: this script is just a performance test of the new method vs the old method of persisting users
// TODO: currently not working. not worth the time to fix
const constants = require('../src/constants');

const { DB_USERS, DB_USER_LIST } = constants;

const {promisify} = require('util');

let redis = require('redis');
const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

let id;
let i = 0;
const getAsync = promisify(redisClient.get).bind(redisClient);
const getLAsync = promisify(redisClient.lrange).bind(redisClient);
setTimeout(() => {console.log('exiting early at 30s');process.exit()}, 30000)

const iterations = 5;

const knowId = () => {
    i = 0;
    console.time('change single user knowing id');
    for(var i = 0; i < iterations; i++ ){
      getAsync(`user:${id}`).then(user => {
        user.history = user.history
        redisClient.set(`user:${id}`, user);
      }).catch();
      redisClient.quit();
    }
    if (i === iterations -1) {
      console.timeEnd('change single user knowing id')
    }
}

const notKnowId = () => {
  i = 0;
  console.log(id)
  console.time('change single user not knowing id');
  for(var i = 0; i < iterations; i++ ){
    getLAsync(DB_USER_LIST, -1, -2).then(uId => {
      getAsync(`user:${uId}`).then(user => {
        user.history = user.history
        redisClient.set(`user:${id}`, user);
      }).catch();
    });
  }
  if (i === iterations -1) {
    console.timeEnd('change single user not knowing id');
    setTimeout(() => {
      knowId();
    }, 3000);
  }
}

console.time('Function #1');
for (i = 0; i < iterations -1; i++) {
  getAsync(DB_USERS).then(res => {
    const users = JSON.parse(res);
    const newUsers = users.map((user, i) => {
      if (i === users.length - 1) {id = user.id;user.history = user.history};
      return user;
    });
    redisClient.set('users', JSON.stringify(newUsers), () => {
      if (i === iterations - 1) {
        console.timeEnd('Function #1');
        setTimeout(() => {
          notKnowId();
        }, 3000);
    };
  });
}).catch(e => {console.log(e); process.exit(1);});
}
