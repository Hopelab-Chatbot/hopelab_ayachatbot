const {
    getUsers,
    getConversations,
    getCollections,
    getSeries,
    getBlocks,
    getMessages,
    getMedia
} = require('./database');

const { sendPushMessagesToUsers } = require('./facebook');


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

    return Promise.all(promises)
      .then(res => {
          const users = res[0];
          const allConversations = res[1];
          const allCollections = res[2];
          const allMessages = res[3];
          const allSeries = res[4];
          const allBlocks = res[5];
          const media = res[6];
          const studyInfo = res[7];

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
