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
    getStudyInfo
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
                            ];

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
                                        studyInfo
                                    });
                                })
                                .catch(e =>
                                    console.error(
                                        'error: webhook - error retrieving all data.',
                                        e
                                    )
                                );
                        } else {
                            console.error(
                                'Webhook received unknown event: ',
                                event
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
