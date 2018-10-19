const R = require('ramda');
const { MESSAGE_TYPE_TRANSITION,
  INTRO_CONVERSATION_ID,
  RESET_USER_KEY_MESSAGE,
  RESET_USER_RESPONSE_CONFIRM,
  RESET_USER_RESPONSE_CANCEL,
  STUDY_ID_NO_OP,
  CURSING_STOP_TRIGGERS,
  STOP_MESSAGES,
  TYPE_STOP_NOTIFICATIONS,
  QUICK_REPLY_BLOCK_ID,
  CRISIS_RESPONSE_MESSAGE_ID,
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

const isQuickReplyRetry = message => (
  message.isQuickReplyRetry || (message.parent && message.parent.id === QUICK_REPLY_BLOCK_ID)
);

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
          !(ignoreQuickReplyRetryMessages && user.history[i].id === CRISIS_RESPONSE_MESSAGE_ID) &&
          !(ignoreQuickReplyRetryMessages && isQuickReplyRetry(user.history[i]))
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
  let studyId = String(STUDY_ID_NO_OP);
  const stringStudyIdList = studyIdList.map(String);
  const potentialIds = R.difference(stringStudyIdList, studyInfo);
  if (potentialIds && potentialIds.length) {
    studyId = potentialIds[0];
    studyInfo.push(studyId);
  }
  return {studyId, newStudyInfoList: studyInfo};
}

const keyFormatMessageId = id => `message:${id}`;

const formatAsEventName = name => `msg_event-${name}`;

const cleanText = text =>
  text
    .toLowerCase()
    .replace(/[.,\/#\?!$%\^&\*;:{}=\-_`~()]/g, ""); //eslint-disable-line no-useless-escape

const padText = text => ` ${text} `;

const findKeyPhrasesInTextBlock = (text, keywords) => {
  const formattedText = padText(cleanText(text));
  let acc = false;
  keywords.forEach(word => {
    if (formattedText.includes(padText(word))) {
      acc = true;
    }
  });
  return acc;
};

const  isCrisisMessage = (message, crisisTerms = [], crisisExactWords = []) => {
  if (!message || !message.text) {
    return false;
  }

  return R.any(R.equals(cleanText(message.text)), crisisExactWords.map(cleanText)) ||
    findKeyPhrasesInTextBlock(message.text, crisisTerms);
};

const isStopOrSwearing = text => {
  return R.any(R.equals(cleanText(text)), STOP_MESSAGES.map(cleanText)) ||
  findKeyPhrasesInTextBlock(text, CURSING_STOP_TRIGGERS.map(cleanText));
};

const isQuickReplyRetryStop = message => (
  message && message.quick_reply &&
  message.quick_reply.payload && R.equals(message.quick_reply.payload.type, TYPE_STOP_NOTIFICATIONS)
);

module.exports = {
  formatAsEventName,
  havePassedTransition,
  messageIsInIntroConversation,
  isUserResetMessage,
  isUserConfirmReset,
  getLastSentMessageInHistory,
  getLastMessageSentByUser,
  isUserCancelReset,
  generateUniqueStudyId,
  keyFormatMessageId,
  isStopOrSwearing,
  isCrisisMessage,
  isQuickReplyRetryStop
};
