const JSONbig = require('json-bigint');

const { receivedMessage } = require('./facebook');

const {
  getUserById,
  getConversations,
  getCollections,
  getSeries,
  getBlocks,
  getMessages,
  getMedia,
  getStudyInfo,
  getParams,
  unArchiveUser,
  findInUserList
} = require('./database');

const { FB_VERIFY_TOKEN } = require('./constants');

module.exports = app => {
  app.get('/webhook/', (req, res) => {
    if (req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
      res.send(req.query['hub.challenge']);
    } else {
      res.send('Error, wrong validation token');
    }
  });

  app.post('/webhook/', (req, res) => {
    try {
      const data = JSONbig.parse(req.body);
      if (data.object === 'page') {
        data.entry.forEach(entry => {
          entry.messaging.forEach(event => {
            if (event.message) {
              const senderID = event.sender.id;
              const message = event.message;
              const promises = [
                getUserById(senderID),
                getConversations(),
                getCollections(),
                getMessages(),
                getSeries(),
                getBlocks(),
                getMedia(),
                getStudyInfo(),
                getParams(),
                findInUserList(senderID),
              ];
              // if user is posting to webhook, but they aren't in the DB_USER_LIST, then they must have been archived
              Promise.all(promises)
                .then(res => {
                  let user = Object.assign({}, res[0]);
                  const allConversations = res[1];
                  const allCollections = res[2];
                  const allMessages = res[3];
                  const allSeries = res[4];
                  const allBlocks = res[5];
                  const media = res[6];
                  const studyInfo = res[7];
                  const params = res[8];
                  const inUserList = res[9];
                  if (!inUserList && senderID) {
                    unArchiveUser(senderID);
                  }
                  receivedMessage({
                    senderID,
                    message,
                    user,
                    allConversations,
                    allCollections,
                    allMessages,
                    allSeries,
                    allBlocks,
                    media,
                    studyInfo,
                    params,
                  });
                })
                .catch(e =>
                  console.error(
                    'error: webhook - error retrieving all data.',
                    e
                  )
                );
            }
          });
        });
      }

      return res.status(200).json({
        status: 'ok'
      });
    } catch (err) {
      console.error('error: webhook', err);

      return res.status(400).json({
        status: 'error',
        error: err
      });
    }
  });
};
