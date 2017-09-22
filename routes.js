const JSONbig = require('json-bigint');

const { getActionMessages } = require('./messages');

// facebook utils
const { FacebookBot, getUserDetails } = require('./facebook');
const facebookBot = new FacebookBot();

module.exports = function(app) {
    // this is the api.ai webhook that is called when
    // an intent is matched to a given user input
    // typically how we are doing this is that we
    // look at the action provided for this intent,
    // and find the corresponding messages associated
    // and then relay those back to fb messenger
    app.post('/apiai-webhook/', (req, res) => {
        const body = JSON.parse(req.body);
        const originalRequest = body.originalRequest;
        const result = body.result;

        getUserDetails(originalRequest.data.sender.id)
            .then(user => {
                res.status(200).json({
                    source: 'webhook',
                    speech: '',
                    messages: getActionMessages(result.action, user)
                });
            })
            .catch(e => {
                console.warn('there was an error retrieving the user details from facebook');
                res.status(200).json({
                    source: 'webhook',
                    speech: '',
                    messages: getActionMessages(result.action, {})
                });
            })
    });

    // this is the webhook that is called initially
    // when registering app with fb messenger - only called once
    app.get('/webhook/', (req, res) => {
        if (req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
            res.send(req.query['hub.challenge']);

            setTimeout(() => {
                // facebookBot.doSubscribeRequest();
            }, 3000);
        } else {
            res.send('Error, wrong validation token');
        }
    });

    // this webhook is called for every message
    // sent from fb messenger - this pipes it into
    // the bot service being used (api.ai || wit.ai, etc.)
    app.post('/webhook/', (req, res) => {
        try {
            const data = JSONbig.parse(req.body);

            if (data.entry) {
                let entries = data.entry;
                entries.forEach((entry) => {
                    let messaging_events = entry.messaging;
                    if (messaging_events) {
                        messaging_events.forEach((event) => {
                            if (event.message && !event.message.is_echo) {

                                const senderId = event.sender.id;
                                
                                if (event.message.attachments) {
                                    let locations = event.message.attachments.filter(a => a.type === "location");

                                    // delete all locations from original message
                                    event.message.attachments = event.message.attachments.filter(a => a.type !== "location");

                                    if (locations.length > 0) {
                                        locations.forEach(l => {
                                            let locationEvent = {
                                                sender: event.sender,
                                                postback: {
                                                    payload: "FACEBOOK_LOCATION",
                                                    data: l.payload.coordinates
                                                }
                                            };

                                            facebookBot.processFacebookEvent(locationEvent);
                                        });
                                    }
                                }
                                
                                facebookBot.processMessageEvent(event);
                            } else if (event.postback && event.postback.payload) {
                                if (event.postback.payload === "FACEBOOK_WELCOME") {
                                    facebookBot.processFacebookEvent(event);
                                } else {
                                    facebookBot.processMessageEvent(event);
                                }
                            }
                        });
                    }
                });
            }

            return res.status(200).json({
                status: "ok"
            });
        } catch (err) {
            return res.status(400).json({
                status: "error",
                error: err
            });
        }
    });
}