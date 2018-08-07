// NOTE: this is a helpful utility while doing dev
// $ node ./scripts/dod.js user:189184588598805
// will return the expiration time for key user:189184588598805

const redis = require('redis')

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
const time = redisClient.expire(myId, 60)
console.log('this key will expire at ' + time);

redisClient.quit();
