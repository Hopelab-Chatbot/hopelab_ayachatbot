const {
    getUsers,
    getConversations,
    getCollections,
    getSeries,
    getBlocks,
    getMessages,
    getMedia,
    getStudyInfo
} = require('./database');

const { hasStoppedNotifications } = require('./users')

const { sendPushMessagesToUsers } = require('./facebook');

const { logger } = require('./logger');

module.exports = () => {
    const promises = [
        getUsers(),
        getConversations(),
        getCollections(),
        getMessages(),
        getSeries(),
        getBlocks(),
        getMedia(),
        getStudyInfo()
    ];

    logger.log('debug', 'About to execute promise for all redis data, push messages');
    return Promise.all(promises)
      .then(res => {
          const users = res[0].filter(u => !hasStoppedNotifications(u));
          const allConversations = res[1];
          const allCollections = res[2];
          const allMessages = res[3];
          const allSeries = res[4];
          const allBlocks = res[5];
          const media = res[6];
          const studyInfo = res[7];

          logger.log('debug', 'got all info from redis for sending push messages');
          return sendPushMessagesToUsers({
            users,
            allConversations,
            allCollections,
            allMessages,
            allSeries,
            allBlocks,
            media,
            studyInfo
          });
      });
}
