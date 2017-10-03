const JSONbig = require('json-bigint');

const { getActionMessages } = require('./messages');

const { getUserDetails, receivedMessage } = require('./facebook');

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
                    var pageID = entry.id;
                    var timeOfEvent = entry.time;
            
                    // Iterate over each messaging event
                    entry.messaging.forEach(function(event) {
                        if (event.message) {
                            receivedMessage(event);
                        } else {
                            console.log('Webhook received unknown event: ', event);
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
}