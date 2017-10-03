const request = require('request');

const {
    updateHistory
} = require('./users');

const {
    updateUser
} = require('./database');

const {
    FB_GRAPH_ROOT_URL,
    FB_PAGE_ACCESS_TOKEN
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
            function(error, response) {
                resolve(JSON.parse(response.body));

                if (error) {
                    console.log('error: getUserDetails - sending message: ', error);
                    reject(error);
                } else if (response.body.error) {
                    console.log('error: getUserDetails - response body error', response.body.error);
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
            function(error, response, body) {
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
 * @param {Object} message
 * @return {Promise<String>}
*/
function sendMessage(recipientId, message) {
    const messageData = {
        recipient: {
            id: recipientId
        },
        message
    };

    return () => {
        return callSendAPI(messageData);
    };
}

/**
 * Receive Message From Facebook Messenger
 * 
 * @param {Object} event
 * @return {void}
*/
function receivedMessage({ senderID, message, user, allMessages, allBlocks }) {
    let userToUpdate = Object.assign({}, user);
    
    let prevMessage =
        allMessages.find(
            m =>
                m.id ===
                (user.history[user.history.length - 1] || {}).id
        ) || {};

    userToUpdate = Object.assign(
        {},
        userToUpdate,
        { history: updateHistory(
            {
                type: 'answer',
                timestamp: Date.now(),
                message,
                previous: prevMessage.id
            },
            userToUpdate.history
        )}
    );

    let action = getActionForMessage(message, userToUpdate, allBlocks);

    // the new constructed messages to be sent back
    let messagesForAction = getMessagesForAction({
        action,
        messages: allMessages,
        blocks: allBlocks,
        user: userToUpdate
    });

    const {
        messagesToSend,
        history,
        blockScope
    } = messagesForAction;

    userToUpdate = Object.assign(
        {},
        userToUpdate,
        {
            history,
            blockScope
        }
    );

    // send messages out to Messenger
    promiseSerial(messagesToSend.map(msg => sendMessage(senderID, msg)))
        .then(() => {
            updateUser(userToUpdate)
                .then(() => {
                    console.log(`User ${userToUpdate.id} updated successfully`);
                })
                .catch(e => console.log('Error: updateUser', e));
        })
        .catch(console.error.bind(console));
}

module.exports = {
    getUserDetails,
    receivedMessage
};
