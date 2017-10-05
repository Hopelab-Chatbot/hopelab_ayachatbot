const request = require('request');

const { updateHistory, getPreviousMessageInHistory } = require('./users');

const { updateUser } = require('./database');

const {
    FB_GRAPH_ROOT_URL,
    FB_PAGE_ACCESS_TOKEN,
    TYPING_TIME_IN_MILLISECONDS
} = require('./constants');

const { getMessagesForAction, getActionForMessage } = require('./messages');

const { promiseSerial } = require('./utils');

/**
 * Get User Details
 * 
 * @param {String} userId
 * @return {Promise}
*/
function getUserDetails(userId) {
    return new Promise((resolve, reject) => {
        request(
            {
                url: `${FB_GRAPH_ROOT_URL}${userId}?fields=first_name,last_name,profile_pic&access_token=${FB_PAGE_ACCESS_TOKEN}`,
                qs: { access_token: FB_PAGE_ACCESS_TOKEN },
                method: 'GET'
            },
            (error, response) => {
                resolve(JSON.parse(response.body));

                if (error) {
                    console.error(
                        'error: getUserDetails - sending message: ',
                        error
                    );
                    reject(error);
                } else if (response.body.error) {
                    console.error(
                        'error: getUserDetails - response body error',
                        response.body.error
                    );
                    reject(response.body.error);
                }
            }
        );
    });
}

/**
 * Send Message to Facebook API
 * 
 * @param {Object} messageData
 * @return {Promise<String>}
*/
function callSendAPI(messageData) {
    return new Promise((resolve, reject) => {
        request(
            {
                uri: `${FB_GRAPH_ROOT_URL}me/messages`,
                qs: { access_token: FB_PAGE_ACCESS_TOKEN },
                method: 'POST',
                json: messageData
            },
            (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    var messageId = body.message_id;

                    resolve(messageId);
                } else {
                    console.error('Unable to send message.');
                    console.error(response);
                    console.error(error);

                    reject(error);
                }
            }
        );
    });
}

/**
 * Async Wrapper for callSendAPI
 * 
 * @param {String} recipientId
 * @param {Object} content
 * @return {Promise<String>}
*/
function sendMessage(recipientId, content) {
    const { type, message } = content;

    let messageData = {
        recipient: {
            id: recipientId
        }
    };
    let time = type === 'message' ? TYPING_TIME_IN_MILLISECONDS : 0;

    if (type === 'message') {
        messageData.message = message;
    } else if (type === 'typing_on' || type === 'typing_off') {
        messageData.sender_action = type;
    }

    return () => {
        return new Promise(r => {
            return setTimeout(() => {
                r(callSendAPI(messageData));
            }, time);
        });
    };
}

function addTypingIndicatorToMessages(messages) {
    let messagesWithTyping = [];

    for (let i = 0; i < messages.length; i++) {
        messagesWithTyping.push({
            type: 'typing_on'
        });

        messagesWithTyping.push(messages[i]);
    }

    return messagesWithTyping;
}

/**
 * Receive Message From Facebook Messenger
 * 
 * @param {Object} event
 * @return {void}
*/
function receivedMessage({
    senderID,
    message,
    user,
    allMessages,
    allBlocks,
    media
}) {
    let userToUpdate = Object.assign({}, user);

    const prevMessage = getPreviousMessageInHistory(allMessages, user);

    userToUpdate = Object.assign({}, userToUpdate, {
        history: updateHistory(
            {
                type: 'answer',
                timestamp: Date.now(),
                message,
                previous: prevMessage.id
            },
            userToUpdate.history
        )
    });

    const action = getActionForMessage(message, userToUpdate, allBlocks);

    const { messagesToSend, history, blockScope } = getMessagesForAction({
        action,
        messages: allMessages,
        blocks: allBlocks,
        user: userToUpdate,
        media
    });

    userToUpdate = Object.assign({}, userToUpdate, {
        history,
        blockScope
    });

    const messagesWithTyping = addTypingIndicatorToMessages(messagesToSend);

    // send all messages out to Messenger
    promiseSerial(messagesWithTyping.map(msg => sendMessage(senderID, msg)))
        .then(() => {
            updateUser(userToUpdate)
                .then(() => {
                    console.error(
                        `User ${userToUpdate.id} updated successfully`
                    );
                })
                .catch(e => console.error('Error: updateUser', e));
        })
        .catch(e => console.error('error: promiseSerial', e));
}

module.exports = {
    getUserDetails,
    receivedMessage
};
