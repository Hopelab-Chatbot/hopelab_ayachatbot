// NOTE: this script breaks the large JSON string of messages into discrete msg keys for better
// performance, storage, and debug ability.

const constants = require('../src/constants');
const { keyFormatCollectionId } = require('../src/utils/collection_utils');
const { DB_COLLECTION_LIST, DB_COLLECTIONS } = constants;


const {promisify} = require('util');

let redis = require('redis');

const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});


const getAsync = promisify(redisClient.get).bind(redisClient);

getAsync(DB_COLLECTIONS).then(res => {
  const json_colls = JSON.parse(res);
  const length = json_colls.length;
  json_colls.forEach((coll, i) => {
    const { id } = coll;
    redisClient.lpush(DB_COLLECTION_LIST, id);
    redisClient.set(keyFormatCollectionId(id), JSON.stringify(coll));
    if ( i === json_colls.length - 1) {
      console.log('rewrote ' + length + ' collections');// eslint-disable-line no-console
      redisClient.quit();
      setTimeout(() => {
        process.exit(0);
      }, 3000);
    }
  });
}).catch(err => {console.log(err); process.exit(1);}); // eslint-disable-line no-console
