// NOTE: this script gets the largest user key. It is useful if you think there may be a bot
// trying to spam our bot. This script will write to a file to easily inspect the object.

const constants = require('../src/constants');
var fs = require('fs');
const { keyFormatUserId, getUserById } = require('../src/database');

const { DB_USER_LIST, TYPE_ANSWER, DB_ARCHIVE_USER_LIST } = constants;

const {promisify} = require('util');

const redis = require('redis');

const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});


const getLAsync = promisify(redisClient.lrange).bind(redisClient);
const term = process.argv[2];
console.log('searching for: ' + term);
const termRegex = new RegExp(term, 'i');
getLAsync(DB_USER_LIST, 0, -1).then(userIds => {
  getLAsync(DB_ARCHIVE_USER_LIST, 0, -1).then(archiveUserIds => {
    const promises = archiveUserIds.concat(userIds).map(id => {
      return getUserById(id);
    });
    Promise.all(promises).then(users => {
      let i = 0;
      let j = 0;
      let found = false;
      let id;
      while (!found) {
        j = 0;
        if (users[i] && users[i].history.length) {
          for (j; j < users[i].history.length; j++) {
            if (users[i].history[j].type == TYPE_ANSWER) { // only search replies
              if ( users[i].history[j].message && users[i].history[j].message.text
                && users[i].history[j].message.text.search(termRegex) > - 1) {
                found = true;
                id = users[i].id;
                break;
              }
            }
          }
        }
        i ++
        if (!users[i]) {
          // just to break out of the loop
          found = true;
        }
      }
      if (id) {
        console.log('the relevant user id is: ' + id);
      } else {
        console.log('no user was found with that item in the text');
      }
      redisClient.quit();
      setTimeout(() => {
        process.exit(0)
      }, 3000);
    })
  })
  .catch(console.log);
}).catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
