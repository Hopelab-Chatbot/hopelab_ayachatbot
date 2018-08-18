const R = require('ramda');
const { MESSAGE_TYPE_TRANSITION, INTRO_CONVERSATION_ID } = require('../constants');

const messageIsTransition = message => (
  R.path(['messageType'], message) === MESSAGE_TYPE_TRANSITION
);

const havePassedTransition = user =>
  !!R.find(messageIsTransition, user.history);

const messageIsInIntroConversation = message => {
  const convoId = R.path(["parent","id"], message);
  return R.equals(convoId, INTRO_CONVERSATION_ID);
};

module.exports = {
  havePassedTransition,
  messageIsInIntroConversation
};
