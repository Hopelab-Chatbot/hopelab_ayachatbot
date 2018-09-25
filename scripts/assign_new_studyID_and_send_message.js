// NOTE: This script determines if the user has completed the intro conversatiom,
// and sets the corresponding value to true in the user object so they will get push notifications

const constants = require('../src/constants');
const { getUserById, getStudyInfo, setStudyInfo, updateUser } = require('../src/database');
const { serializeSend } = require('../src/facebook');
const { generateUniqueStudyId } = require('../src/utils/msg_utils');

const { STUDY_ID_LIST, TYPE_MESSAGE, QUICK_REPLY_RETRY_BUTTONS } = constants;

const redis = require('redis');
const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

const button = QUICK_REPLY_RETRY_BUTTONS[0];

const quick_replies = [{
  content_type: "text",
  title: button.title,
  payload: JSON.stringify({id: button.id, type: TYPE_MESSAGE})
}];

const userIds = [
  '1847361098686217',
  '1897796636994427',
  '1987513874645591',
  '1926068177479912',
  '1877679515645073',
];

const promises = userIds.map(id => {
  return getUserById(id);
});

const userPromises = [];

Promise.all(promises).then(users => {
  getStudyInfo().then(studyInfo => {
    let mutableStudyInfo = studyInfo;
    users.forEach((user, i) => {
      const userUpdates = Object.assign({}, user);
      const {studyId, newStudyInfoList} = generateUniqueStudyId(mutableStudyInfo, STUDY_ID_LIST);
      mutableStudyInfo = newStudyInfoList;
      const text = `Sorry, I assigned you the wrong participant code. Your new code is ${studyId}. Please visit https://hopelab.az1.qualtrics.com/jfe/form/SV_3k19jeWjxbOu7Rz with this code to complete the first study survey for $20.`;
      userUpdates.studyId = studyId;
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
      if ( i === users.length -1) {
        Promise.all(userPromises).then(() => {
          setStudyInfo(studyInfo);
          redisClient.quit();
          setTimeout(() => {
            process.exit(0);
          }, 3000);
        });
      }
    });
  });
})
  .catch(err => console.log(err)); // eslint-disable-line no-console
