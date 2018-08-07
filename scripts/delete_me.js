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

redisClient.del(`user:${myId}`);
console.log('deleted user: ' + myId)
redisClient.quit()
