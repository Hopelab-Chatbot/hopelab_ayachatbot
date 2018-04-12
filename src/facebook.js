const request = require('request');

const R = require('ramda');

const { updateHistory, getPreviousMessageInHistory } = require('./users');

const { updateUser, updateAllUsers, setStudyInfo } = require('./database');

const { logger } = require('./logger');

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
                    logger.log('error', `Unable to send message to user, error: ${JSON.stringify(error)}, response: ${JSON.stringify(response)}, message: ${JSON.stringify(messageData)}`)
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

function serializeSend({
  messages,
  senderID,
  fbMessagingType=FB_MESSAGING_TYPE_RESPONSE
}) {
  return promiseSerial(messages.map(msg => sendMessage(senderID, msg, fbMessagingType)));
}

/**
 * Receive Message From Facebook Messenger
 *
 * @param {Array} messages
 * @param {String} senderID
 * @param {Object} user
 * @return {Promise}
*/
function sendAllMessagesToMessenger({
  messages,
  senderID,
  user,
  studyInfo,
  fbMessagingType=FB_MESSAGING_TYPE_RESPONSE
}) {
    return serializeSend({messages, senderID, fbMessagingType})
        .then(() => {
            updateUser(user)
                .then(() => {
                  console.log(`User ${user.id} updated successfully`);
                })
                .then(() => {
                  if (Array.isArray(studyInfo)) {
                    return setStudyInfo(studyInfo).then(() => {
                      let logStr = `New study participant (user: ${user.id}) created with study id: ${studyInfo[studyInfo.length - 1]}`;
                      console.log(logStr);
                      logger.log('info', logStr);
                    });
                  }
                })
                .catch(e => {
                  logger.log('error', `Error: updateUser, ${JSON.stringify(e)}`);
                })
        })
        .catch(e => {
          logger.log('error', `Promise serial, ${JSON.stringify(e)}`);
        })
}

function userIsStartingStudy(oldUser, newUser) {
  return !Number.isFinite(Number(R.path(['studyId'],oldUser))) &&
         Number.isFinite(Number(R.path(['studyId'], newUser)));
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
    media,
    studyInfo
}) {
    let userToUpdate = Object.assign({}, user);

    const prevMessage = getPreviousMessageInHistory(allMessages, user);

    logger.log('debug', `receivedMessage: ${JSON.stringify(message)} prevMessage: ${JSON.stringify(prevMessage)}`);

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

    const { action, userActionUpdates } =  getActionForMessage({
        message,
        user: userToUpdate,
        blocks: allBlocks,
        series: allSeries,
        messages: allMessages,
        collections: allCollections,
        conversations: allConversations,
        studyInfo
    });

    userToUpdate = Object.assign({}, userToUpdate, userActionUpdates);

    const { messagesToSend, userUpdates } = getMessagesForAction({
        action,
        conversations: allConversations,
        collections: allCollections,
        messages: allMessages,
        series: allSeries,
        blocks: allBlocks,
        user: userToUpdate,
        media,
        studyInfo
    });

    userToUpdate = Object.assign({}, userToUpdate, userUpdates);

    const messagesWithTyping = R.intersperse(
        { type: FB_TYPING_ON_TYPE },
        messagesToSend
    );

    let newStudyInfo;
    if (userIsStartingStudy(user, userToUpdate)) {
      newStudyInfo = studyInfo.slice();
      newStudyInfo.push(userToUpdate.studyId);

      // TODO: send study survey every 2 weeks for 6 weeks
    }

    sendAllMessagesToMessenger({
      messages: messagesWithTyping,
      senderID,
      user: userToUpdate,
      studyInfo: newStudyInfo,
      fbMessagingType: FB_MESSAGING_TYPE_RESPONSE
    });
}

function sendPushMessagesToUsers({
  users,
  allConversations,
  allCollections,
  allMessages,
  allSeries,
  allBlocks,
  media,
  studyInfo
}) {
  const allActions = getUpdateActionForUsers({users,
      allConversations,
      allCollections,
      allMessages,
      allSeries,
      allBlocks,
      media,
      studyInfo
  });

  // Throttle the number of updates that happend at once.
  const MAX_ACTIONS_ALLOWED = 5;
  const actions = allActions.slice(0, MAX_ACTIONS_ALLOWED);

  logger.log("debug", `Begin of push messages to ${actions.length} users`);
  const promisesForSend = actions.map(({action, userActionUpdates}) => {
    let userToUpdate = Object.assign({}, userActionUpdates);
    const originalHistoryLength = R.path(['history', 'length'], userToUpdate);

    if (!originalHistoryLength) {
      return Promise.resolve();
    }
    const { messagesToSend, userUpdates } = getMessagesForAction({
        action,
        conversations: allConversations,
        collections: allCollections,
        messages: allMessages,
        series: allSeries,
        blocks: allBlocks,
        user: userToUpdate,
        media,
        studyInfo
    });

    userToUpdate = Object.assign({}, userToUpdate, userUpdates);

    let history = userToUpdate.history.slice();
    for(let i = originalHistoryLength; i < history.length; i++) {
      if (history[i].type !== TYPE_ANSWER) {
        history[i] = Object.assign({}, history[i], {isUpdate: true});
        break;
      }
    }

    userToUpdate = Object.assign({}, userToUpdate, {history});

    const messagesWithTyping = R.intersperse(
        { type: FB_TYPING_ON_TYPE },
        messagesToSend
    );

    return () => serializeSend({
        messages: messagesWithTyping,
        senderID: userToUpdate.id,
        fbMessagingType: FB_MESSAGING_TYPE_UPDATE
      }).then(() => userToUpdate);
  });

  if (!Array.isArray(promisesForSend) || promisesForSend.length === 0) {
    logger.log("debug", 'No push updates to send to users. Done');
    return Promise.resolve();
  }

  logger.log("debug", `About to push to ${promisesForSend.length} users`);
  return promiseSerial(promisesForSend)
            .then(users => {
              logger.log('debug', `Messages sent, now saving updates for ${R.path(['length'],users)} users`)
              return users;
            })
            .then(users => updateAllUsers(users).then(() => users))
            .then(users => {
              if (Array.isArray(users)) {
                users.forEach(u => {
                  console.log(`User ${u.id} updated successfully`)
                  logger.log('debug', `User,${u.id}, updated successfully`)
                });
              }
              return users;
            })
            .catch(e => console.error('Error: updateAllUsers', e));
}

module.exports = {
    getUserDetails,
    receivedMessage,
    sendPushMessagesToUsers,
};
