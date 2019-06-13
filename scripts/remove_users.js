const config = require('config');
const redis = require('redis');
const { promisify } = require('util');

const constants = require('../src/constants');

const { DB_USER_LIST, DB_ARCHIVE_USER_LIST } = constants;

const redistClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port 
});

const get = promisify(redistClient.lrange).bind(redistClient);
const del = promisify(redistClient.del).bind(redistClient);

Promise.all([
  get(DB_USER_LIST, 0, -1),
  get(DB_ARCHIVE_USER_LIST, 0, -1)
])
  .then(([usersIds, archiveUsersIds]) => usersIds.concat(archiveUsersIds))
  .then(usersIds => usersIds.map(userId => del(`user:${userId}`)))
  .then(promises => Promise.all(promises))
  .then(() => del(DB_USER_LIST))
  .then(() => del(DB_ARCHIVE_USER_LIST))
  .then(() => redistClient.quit())
  .catch(console.error)
  .then(() => process.exit(0));

