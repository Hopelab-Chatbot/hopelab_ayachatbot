const R = require('ramda');
const { MESSAGE_TYPE_TRANSITION,
  INTRO_CONVERSATION_ID,
  RESET_USER_KEY_MESSAGE,
  RESET_USER_RESPONSE_CONFIRM,
  RESET_USER_RESPONSE_CANCEL,
  STUDY_ID_NO_OP,
  TYPE_ANSWER } = require('../constants');

const messageIsTransition = message => (
  R.path(['messageType'], message) === MESSAGE_TYPE_TRANSITION
);

const havePassedTransition = user =>
  !!R.find(messageIsTransition, user.history);

const messageIsInIntroConversation = message => {
  const convoId = R.path(["parent","id"], message);
  return R.equals(convoId, INTRO_CONVERSATION_ID);
};

const isUserResetMessage = (message = {}) => {
  let messageToCheck = message;
  if (message.message) {
    messageToCheck = message.message;
  }
  return R.equals(messageToCheck.text, RESET_USER_KEY_MESSAGE);
};

const isUserConfirmReset = (message = {}) => {
  let messageToCheck = message;
  if (message.quick_reply) {
    messageToCheck = JSON.parse(message.quick_reply.payload);
  }
  return R.equals(messageToCheck.id, RESET_USER_RESPONSE_CONFIRM.id);
};

const isUserCancelReset = (message = {}) => {
  let messageToCheck = message;
  if (message.message && message.message.quick_reply) {
    messageToCheck = JSON.parse(message.message.quick_reply.payload);
  }
  return R.equals(messageToCheck.id, RESET_USER_RESPONSE_CANCEL.id);
};

/**
 * Get the last message sent to user in history
 *
 * @param {Object} user
 * @return {Object}
*/
function getLastSentMessageInHistory(user, ignoreQuickReplyRetryMessages=true) {
  if (!(R.path(['history', 'length'], user))) { return undefined; }

  for (let i = user.history.length - 1; i >= 0; i--) {
    if (
      user.history[i].type !== TYPE_ANSWER &&
          !user.history[i].isCrisisMessage &&
          !(user.history[i].isQuickReplyRetry && ignoreQuickReplyRetryMessages)
    ) {
      return user.history[i];
    }
  }

  return undefined;
}

/**
 * Get the last message sent to user in history
 *
 * @param {Object} user
 * @return {Object}
*/
const getLastMessageSentByUser = user => {
  if (!(R.path(['history', 'length'], user))) { return undefined; }
  return R.findLast(R.propEq('type', TYPE_ANSWER), user.history);
};


function generateUniqueStudyId(studyInfo, studyIdList) {
  let studyInfoSet = new Set(studyInfo.map(String));

  for(let i = 0; i < studyIdList.length; i++) {
    if (!studyInfoSet.has(String(studyIdList[i]))) {
      return String(studyIdList[i]);
    }
  }
  return String(STUDY_ID_NO_OP);
}

const keyFormatMessageId = id => `message:${id}`;

module.exports = {
  havePassedTransition,
  messageIsInIntroConversation,
  isUserResetMessage,
  isUserConfirmReset,
  getLastSentMessageInHistory,
  getLastMessageSentByUser,
  isUserCancelReset,
<<<<<<< refs/remotes/origin/staging
  generateUniqueStudyId
=======
  keyFormatMessageId,
>>>>>>> refactor messages/collections issue
};
