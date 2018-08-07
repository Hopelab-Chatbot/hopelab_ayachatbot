const {promisify} = require('util');

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

const getLAsync = promisify(redisClient.lrange).bind(redisClient);

getLAsync("userlist", 0, 1000).then(userIds => {
  userIds.forEach(id => {
    redisClient.del(`msg:${id}`);
  });
  redisClient.del('msglist');
  redisClient.quit()
}).catch(err => {console.log(err);process.exit(1)})// eslint-disable-line no-console
