// NOTE: This script determines if the user has completed the intro conversatiom,
// and sets the corresponding value to true in the user object so they will get push notifications

const R = require('ramda');

const constants = require('../src/constants');
const { keyFormatUserId, getUserById } = require('../src/database');

const { DB_USER_LIST, INTRO_CONVERSATION_ID } = constants;

const {promisify} = require('util');

const redis = require('redis');
const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

const scriptHasFinishedIntro = user => {
  // possible transition text out of intro... doesn't seem to be a better way to determine if a user
  // has completed the intro conversation
  const TRANSITIONS = [
    'sweet. I’ll check in on the daily so you don’t forget about me.',
    'Here comes your survey link...',
    "Let's jump in"
  ];
  //filter all messages that aren't intro conversations:
  const intromessages = R.filter(msg =>
    R.path(['parent', 'id'],msg) === INTRO_CONVERSATION_ID, user.history);
  // check that the intersection of this ^ list, and one of the possible 'transitions'
  // to a general conversation is greater than 0:
  return R.any(({ text }) =>
    R.any(s => text.includes(s), TRANSITIONS),
  intromessages);
};

const getLAsync = promisify(redisClient.lrange).bind(redisClient);
let num = 0;
let userNum = 0;
getLAsync(DB_USER_LIST, 0, -1).then(userIds => {
  if (!userIds || userIds.length === 0) {
    console.log('no users to modify')
    redisClient.quit();
    setTimeout(() => {
      process.exit(0)
    }, 3000);
  } else {
    const promises = userIds.map(id => {
      return getUserById(id);
    });
    Promise.all(promises).then(users => {
      users.forEach(user => {
        userNum ++;
        if (scriptHasFinishedIntro(user)) {
          const updatedUser = Object.assign({}, user, {introConversationFinished: true});
          redisClient.set(keyFormatUserId(user.id), JSON.stringify(updatedUser));
          num++;
        }
      });
      console.log('set ' + num + ' users to hasFinishedIntro: true out of ' + userNum);
      redisClient.quit();
      setTimeout(() => {
        process.exit(0);
      }, 3000);
    })
      .catch(err => console.log(err));// eslint-disable-line no-console
  }
}).catch(err => {console.log(err);process.exit(1);});// eslint-disable-line no-console
