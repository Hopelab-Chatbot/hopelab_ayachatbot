// NOTE: This script determines if the user has completed the intro conversatiom,
// and sets the corresponding value to true in the user object so they will get push notifications
const fs = require('fs');
const constants = require('../src/constants');
const { getUserById } = require('../src/database');
const { serializeSend } = require('../src/facebook');

//NOTE: if this gets used again, QUICK_REPLY_RETRY_BUTTONS must be imported from the seeding script
const { TYPE_MESSAGE } = constants;

const redis = require('redis');
const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

const filename = process.argv[2];
const numOfUsers = process.argv[3] ? parseInt(process.argv[3], 10) : null;

fs.readFile(filename, (err, data) => {
  const json = JSON.parse(data);
  const usersFromFile = json.users;
  const text = json.text;
  let userIds = usersFromFile;
  if (numOfUsers) {
    userIds = usersFromFile.slice(0, numOfUsers);
  }
  const promises = userIds.map(id => {
    return getUserById(id);
  });
  Promise.all(promises).then(users => {
    const userPromises = users.map(user => {
      const messages = [{
        type: TYPE_MESSAGE,
        message: { text },
      }];
      return Promise.resolve(serializeSend({
        messages,
        senderID: user.id,
      }).catch(console.error)
      );

    });

    // if ( i === users.length -1) {
    Promise.all(userPromises).then(() => {
      redisClient.quit();
      setTimeout(() => {
        process.exit(0);
      }, 3000);
    });
  })
    .catch(err => console.log(err)); // eslint-disable-line no-console
});
