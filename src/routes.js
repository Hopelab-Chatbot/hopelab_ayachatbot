const JSONbig = require('json-bigint');

const { receivedMessage } = require('./facebook');

const {
    getUserById,
    getMessages,
    getBlocks
} = require('./database');

module.exports = function(app) {
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
                // Iterate over each entry - there may be multiple if batched
                data.entry.forEach(function(entry) {
                    // Iterate over each messaging event
                    entry.messaging.forEach(function(event) {
                        if (event.message) {
                            const senderID = event.sender.id;
                            const message = event.message;

                            // grab all data needed
                            const promises = [
                                getUserById(senderID),
                                getMessages(),
                                getBlocks()
                            ];

                            Promise.all(promises)
                                .then(res => {
                                    let user = Object.assign({}, res[0]);
                                    const allMessages = res[1];
                                    const allBlocks = res[2];

                                    receivedMessage({
                                        senderID,
                                        message,
                                        user,
                                        allMessages,
                                        allBlocks
                                    });
                                })
                                .catch(e =>
                                    console.log('error: webhook - error retrieving all data.', e)
                                );
                        } else {
                            console.log(
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
            return res.status(400).json({
                status: 'error',
                error: err
            });
        }
    });
};
