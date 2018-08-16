// NOTE: this is a helpful utility while doing dev. It will return when a key expires in redis
// $ node ./scripts/dod.js user:189184588598805
// will return the expiration time for key user:189184588598805
const moment = require('moment');
const redis = require('redis');
const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

const writeTTL = (err, data) => {
  console.log('I live for this long yet: ' + data + ' seconds');
  console.log('meaning I expire on the ' + moment(moment() + data * 1000).format('ddd Do of MMM, YYYY at HH:MM:SS'));
  redisClient.quit();
};

const myId = process.argv[2];
const time = redisClient.ttl(myId, writeTTL);
