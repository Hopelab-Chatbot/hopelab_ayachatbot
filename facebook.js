const request = require('request');
const async = require('async');
const uuid = require('uuid');
const apiai = require('apiai');
const { 
    getUserById, 
    getModules,
    getMessages,
    getBlocks,
    updateUserById
} = require('./database');

const {
    FB_GRAPH_ROOT_URL,
    FB_PAGE_ACCESS_TOKEN,
    FB_TEXT_LIMIT,
    APIAI_ACCESS_TOKEN,
    APIAI_LANG
} = require('./constants');

const {
    getMessagesForAction
} = require('./messages');

const { promiseSerial } = require('./utils');

/**
 * Get User Details
 * 
 * @param {String} userId
 * @return {Promise}
*/
function getUserDetails(userId) {
    return new Promise((resolve, reject) => {
        request({
            url: `${FB_GRAPH_ROOT_URL}${userId}?fields=first_name,last_name,profile_pic&access_token=${FB_PAGE_ACCESS_TOKEN}`,
            qs: { access_token: FB_PAGE_ACCESS_TOKEN },
            method: 'GET',
        }, function (error, response) {
            resolve(JSON.parse(response.body));

            if (error) {
                console.log('Error sending message: ', error);
                reject(error);
            } else if (response.body.error) {
                console.log('Error: ', response.body.error);
                reject(response.body.error);
            }
        });
    });
}

// Send a message to facebook messenger
function callSendAPI(messageData) {
    return new Promise((resolve, reject) => {
        request({
            uri: `${FB_GRAPH_ROOT_URL}me/messages`,
            qs: { access_token: FB_PAGE_ACCESS_TOKEN },
            method: 'POST',
            json: messageData
        
            }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var recipientId = body.recipient_id;
                var messageId = body.message_id;

                resolve(messageId);
            } else {
                console.error("Unable to send message.");
                console.error(response);
                console.error(error);

                reject(error);
            }
        });
    });
  }

// async wrapper for sending message to fb platform
function sendMessage(recipientId, message) {
    const messageData = {
        recipient: {
        id: recipientId
        },
        message
    };

    return () => {
        return callSendAPI(messageData);
    }
}

// determine next starting action based on incoming message
// and the user progress along a block/module
function getActionForMessage(message, user, blocks) {
    let action;

    if (message.quick_reply) {
        action = message.quick_reply.payload;
    } else {
        const lastMessage = user.history[user.history.length - 2];
        if (user.blockScope.length && lastMessage && lastMessage.next) {
            action = lastMessage.next.id;
        } else {
            // TODO: Logic for where to start/move user to next series/collection
            action = blocks.find(b => b.id === 'block-1').startMessage;
            user.blockScope.push('block-1');
        }
    }

    return action;
}

// handle incoming message to the webhook
function receivedMessage(event) {
    const senderID = event.sender.id;
    const recipientID = event.recipient.id;
    const timeOfMessage = event.timestamp;
    const message = event.message;  
  
    const messageText = message.text;

    // grab all data needed
    const promises = [
        getUserById(senderID), 
        getModules(), 
        getMessages(),
        getBlocks()
    ];

    Promise.all(promises).then((res) => {
        let user = Object.assign({}, res[0]);
        const modules = res[1];
        const allMessages = res[2];
        const allBlocks = res[3];

        let prevMessage = allMessages.find(m => m.id === (user.history[user.history.length - 1] || {}).id) || {};      

        // record the user's answer
        user.history.push({
            type: 'answer',
            timestamp: Date.now(),
            message,
            previous: prevMessage.id
        });

        let action = getActionForMessage(message, user, allBlocks);

        // the new constructed messages to be sent back
        let messagesForAction = getMessagesForAction({
            action, 
            messages: allMessages, 
            blocks: allBlocks,
            blockScope: user.blockScope,
            history: user.history
        });

        const { messagesToSend, context, history, blockScope } = messagesForAction;

        user.history = history;
        user.blockScope = blockScope;

        // send messages out to Messenger
        promiseSerial(messagesToSend.map(msg => sendMessage(senderID, msg)))
            .then(() => {
                updateUserById(user.id, user).then(() => {
                    console.log(`User ${user.id} updated successfully`);
                })
                .catch(e => console.log('Error: updateUserById', e));
            })
            .catch(console.error.bind(console))
    })
    .catch(e => console.log('Error: receivedMessage, retrieve all data.', e));
  }

module.exports = {
    getUserDetails,
    receivedMessage
};