// NOTE: This script sets a certain set of User Ids to re-enter the main conversation from the study

const constants = require('../src/constants');
const { getUserById, updateUser } = require('../src/database');
const { serializeSend } = require('../src/facebook');

//NOTE: if this gets used again, QUICK_REPLY_RETRY_BUTTONS must be imported from the seeding script
const {
  TYPE_MESSAGE,
  TYPE_BACK_TO_CONVERSATION,
  COLLECTION_SCOPE,
  COLLECTION_PROGRESS,
  SERIES_PROGRESS,
} = constants;

const redis = require('redis');
const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});


const quick_replies = [{
  content_type: "text",
  title: 'Got it!',
  payload: JSON.stringify({id: 'na', type: TYPE_BACK_TO_CONVERSATION})
}];

const userIds = [
  '2487405974608982',
  '2366300796763764',
  '2345087542175806',
  '2244438468907954',
  '2115024975220808',
  '2049652388391243',
  '2007496109260775',
  '1845559955563824',
  '1011363792322164',
];

const promises = userIds.map(id => {
  return getUserById(id);
});

const userPromises = [];

const userCorrections = {
  [COLLECTION_SCOPE]:[],
  [COLLECTION_PROGRESS]:[],
  [SERIES_PROGRESS]:[],
  assignedConversationTrack: 'r1IJzNy-G'
};
const text = `Hey, you are ready to begin normal content after completing one more check-in (just keep clicking through the prompts).`;

Promise.all(promises).then(users => {
  // getStudyInfo().then(studyInfo => {
  users.forEach(user => {
    const userUpdates = Object.assign({}, user, userCorrections);
    userPromises.push(updateUser(userUpdates).then(() => {
      const messages = [{
        type: TYPE_MESSAGE,
        message: { text, quick_replies },
      }];
      return Promise.resolve(serializeSend({
        messages,
        senderID: user.id,
      }));
    })
      .catch(console.error)
    );
  });
  Promise.all(userPromises).then(() => {
    redisClient.quit();
    setTimeout(() => {
      process.exit(0);
    }, 3000);
  });
})
  .catch(err => console.log(err)); // eslint-disable-line no-console
