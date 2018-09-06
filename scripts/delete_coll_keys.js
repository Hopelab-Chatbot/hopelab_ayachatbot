// NOTE: This script will delete individual message keys, and delete the list of message ids

const constants = require('../src/constants');

const { DB_COLLECTION_LIST, DB_COLLECTIONS } = constants;

const { keyFormatMessageId } = require('../src/utils/msg_utils');
const { getCollectionById } = require('../src/database');

const {promisify} = require('util');

const redis = require('redis');

const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

const getLAsync = promisify(redisClient.lrange).bind(redisClient);

getLAsync(DB_COLLECTION_LIST, 0, -1).then(collIds => {
  if (!collIds || collIds.length === 0) {
    console.log('no collections to reset to collection key')
    redisClient.quit();
    setTimeout(() => {
      process.exit(0)
    }, 3000);
  } else {
    const promises = collIds.map(id => {
      return getCollectionById(id);
    });
    Promise.all(promises).then(colls => {
      if (colls && colls.length > 0 && colls[0]) {
        redisClient.set(DB_COLLECTIONS, JSON.stringify(colls));
        redisClient.del(DB_COLLECTION_LIST);
        colls.forEach(({id = ''}, i) =>  {
          redisClient.del(keyFormatMessageId(id)))
          if (i === colls.length -1) {
            console.log('deleted ' + promises.length + ' individual collection keys');
            redisClient.quit();
            setTimeout(() => {
              process.exit(0);
            }, 3000);
          }
        };
      }
    })
      .catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
  }
}).catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
