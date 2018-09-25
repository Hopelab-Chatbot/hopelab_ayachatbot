// NOTE: This script determines if the user has completed the intro conversatiom,
// and sets the corresponding value to true in the user object so they will get push notifications

const { getUserById, updateUser } = require('../src/database');

const redis = require('redis');
const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

const userIds = [
  '1779737235482689',
  '1927073384053059',
  '1595560697215174',
  '1950288221676724',
  '2421130317904125',
  '1914647971928710',
  '1781881451923493',
  '2760540863972059',
  '1591502270956199',
  '1984853798260913',
  '2223754391029214',
  '2205463782829216',
  '2371237612917184',
  '2280023018735657',
  '2382239135138795',
  '2229557467114511',
  '1917543611646545',
  '1619030964868791',
  '2104269396273324',
  '2084424508244794',
  '1863784053737972',
];

const promises = userIds.map(id => {
  return getUserById(id);
});
Promise.all(promises).then(users => {
  const userPromises = [];
  users.forEach(user => {
    if (user.studyId) {
      const userUpdates = Object.assign({}, user);
      userUpdates.studyId = false;
      userUpdates.studyStartTime = false;
      userPromises.push(updateUser(userUpdates)
        .catch(console.error));// eslint-disable-line no-console
    }
  });
  Promise.all(userPromises).then(() => {
    redisClient.quit();
    setTimeout(() => {
      process.exit(0);
    }, 3000);
  });
})
  .catch(err => console.log(err));// eslint-disable-line no-console
