const constants = require('../src/constants');

const { DB_MESSAGE_LIST } = constants;


const {promisify} = require('util');

let redis = require('redis');

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

const getAsync = promisify(redisClient.get).bind(redisClient);

getAsync("messages").then(res => {
  const json_users = JSON.parse(res)
  const length = json_users.length;
  json_users.forEach(user => {
    const { id } = user;
    redisClient.lpush(DB_MESSAGE_LIST, id);
    redisClient.set(`msg:${id}`, JSON.stringify(user));
  });
  console.log('rewrote ' + length + ' messages')// eslint-disable-line no-console

  redisClient.quit()
}).catch(err => {console.log(err); process.exit(1)}) // eslint-disable-line no-console
