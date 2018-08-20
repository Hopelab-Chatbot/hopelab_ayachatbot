const R = require('ramda');

const hasFinishedIntro = user =>
  R.pathOr(false, ['introConversationFinished'], user);

const hasBegunIntro = user =>
  R.pathOr(false, ['introConversationSeen'], user);

const isInvalidUser = user =>
  R.pathOr(false, ['invalidUser'], user);

module.exports = {
  hasFinishedIntro,
  hasBegunIntro,
  isInvalidUser
};
