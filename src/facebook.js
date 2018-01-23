const request = require('request');

const R = require('ramda');

const { updateHistory, getPreviousMessageInHistory } = require('./users');

const { updateUser } = require('./database');

const {
    FB_GRAPH_ROOT_URL,
    FB_PAGE_ACCESS_TOKEN,
    TYPING_TIME_IN_MILLISECONDS,
    FB_MESSAGE_TYPE,
    FB_TYPING_ON_TYPE,
    FB_MESSAGING_TYPE_RESPONSE,
    FB_MESSAGING_TYPE_UPDATE,
    TYPE_ANSWER,
    TYPE_MESSAGE,
} = require('./constants');

const {
  getMessagesForAction,
  getActionForMessage,
  getUpdateActionForUsers
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
 * Send a follow-up message to a user
 *
 * @param {String} recipientId
 * @param {Object} content
 * @return {Promise<String>}
*/
function sendFollowUpMessageToUser(recipientId, content) {
    const messageData = createMessagePayload(recipientId, content, FB_MESSAGING_TYPE_UPDATE);

    return callSendAPI(messageData);
}

/**
 * Create the FB Message Payload
 *
 * @param {String} recipientId
 * @param {Object} content
 * @return {Object}
*/
function createMessagePayload(
  recipientId,
  content,
  fbMessagingType=FB_MESSAGING_TYPE_RESPONSE
) {
    const { type, message } = content;

    let payload = {
        messaging_type: fbMessagingType,
        recipient: {
            id: recipientId
        }
    };

    if (type === FB_MESSAGE_TYPE) {
        payload.message = message;
    } else if (type === FB_TYPING_ON_TYPE) {
        payload.sender_action = FB_TYPING_ON_TYPE;
    }

    return payload;
}

/**
 * Async Wrapper for callSendAPI
 *
 * @param {String} recipientId
 * @param {Object} content
 * @return {Promise<String>}
*/
function sendMessage(recipientId, content, fbMessagingType=FB_MESSAGING_TYPE_RESPONSE) {
    const messageData = createMessagePayload(recipientId, content, fbMessagingType);
    const time =
        content.type === FB_MESSAGE_TYPE ? TYPING_TIME_IN_MILLISECONDS : 0;

    return () => {
        return new Promise(r => {
            return setTimeout(() => {
                r(callSendAPI(messageData));
            }, time);
        });
    };
}

/**
 * Receive Message From Facebook Messenger
 *
 * @param {Array} messages
 * @param {String} senderID
 * @param {Object} user
 * @return {Promise}
*/
function sendAllMessagesToMessenger(messages, senderID, user, fbMessagingType=FB_MESSAGING_TYPE_RESPONSE) {
    return promiseSerial(messages.map(msg => sendMessage(senderID, msg, fbMessagingType)))
        .then(() => {
            updateUser(user)
                .then(() => {
                    console.log(`User ${user.id} updated successfully`);
                })
                .catch(e => console.error('Error: updateUser', e));
        })
        .catch(e => console.error('error: promiseSerial', e));
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
    allConversations,
    allCollections,
    allMessages,
    allSeries,
    allBlocks,
    media
}) {
    let userToUpdate = Object.assign({}, user);

    const prevMessage = getPreviousMessageInHistory(allMessages, user);

    userToUpdate = Object.assign({}, userToUpdate, {
        history: updateHistory(
            {
                type: TYPE_ANSWER,
                timestamp: Date.now(),
                message,
                previous: prevMessage.id
            },
            userToUpdate.history
        )
    });

    const { action, userActionUpdates } = getActionForMessage({
        message,
        user: userToUpdate,
        blocks: allBlocks,
        series: allSeries,
        messages: allMessages,
        collections: allCollections,
        conversations: allConversations
    });

    userToUpdate = Object.assign({}, userToUpdate, userActionUpdates);

    const { messagesToSend, userUpdates } = getMessagesForAction({
        action,
        collections: allCollections,
        messages: allMessages,
        series: allSeries,
        blocks: allBlocks,
        user: userToUpdate,
        media
    });

    userToUpdate = Object.assign({}, userToUpdate, userUpdates);

    const messagesWithTyping = R.intersperse(
        { type: FB_TYPING_ON_TYPE },
        messagesToSend
    );

    sendAllMessagesToMessenger(messagesWithTyping, senderID, userToUpdate);
}

function sendPushMessagesToUsers({
  users,
  allConversations,
  allCollections,
  allMessages,
  allSeries,
  allBlocks,
  media
}) {
  const actions = getUpdateActionForUsers({users,
      allConversations,
      allCollections,
      allMessages,
      allSeries,
      allBlocks,
      media
  });

  return actions.map(({action, userActionUpdates}) => {
    let userToUpdate = Object.assign({}, userActionUpdates);
    if (!userToUpdate.history) {return undefined;}
    const { messagesToSend, userUpdates } = getMessagesForAction({
        action,
        collections: allCollections,
        messages: allMessages,
        series: allSeries,
        blocks: allBlocks,
        user: userToUpdate,
        media
    });

    userToUpdate = Object.assign({}, userToUpdate, userUpdates);

    const messagesWithTyping = R.intersperse(
        { type: FB_TYPING_ON_TYPE },
        messagesToSend
    );

    return sendAllMessagesToMessenger(
      messagesWithTyping,
      userToUpdate.id,
      userToUpdate,
      FB_MESSAGING_TYPE_UPDATE
    );
  })


}

module.exports = {
    getUserDetails,
    receivedMessage,
    sendPushMessagesToUsers,
};
