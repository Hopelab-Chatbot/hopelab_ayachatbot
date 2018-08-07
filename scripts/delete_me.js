// NOTE: this is a helpful utility while doing dev
// $ node ./scripts/delete_me.js 189184588598805
// will delete 189184588598805

const redis = require('redis')
const constants = require('../src/constants');

const { DB_USER_LIST } = constants;

const config = {
  redis: {
    host: '127.0.0.1',
    port: 6379
  }
}

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

const myId = process.argv[2];

redisClient.del(`user:${myId}`);
redisClient.lrem(DB_USER_LIST, 0, myId);
console.log('deleted user: ' + myId)
redisClient.quit()
