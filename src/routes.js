const JSONbig = require('json-bigint');

const { receivedMessage } = require('./facebook');

const { getUserById, getMessages, getBlocks, getMedia } = require('./database');

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
                                getMessages(),
                                getBlocks(),
                                getMedia()
                            ];

                            Promise.all(promises)
                                .then(res => {
                                    let user = Object.assign({}, res[0]);
                                    const allMessages = res[1];
                                    const allBlocks = res[2];
                                    const media = res[3];

                                    receivedMessage({
                                        senderID,
                                        message,
                                        user,
                                        allMessages,
                                        allBlocks,
                                        media
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
