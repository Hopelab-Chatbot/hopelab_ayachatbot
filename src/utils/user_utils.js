const R = require('ramda');
const { NUMBER_OF_DAYS_WITH_NO_ACTIVITY_BEFORE_ARCHIVING, TYPE_ANSWER } = require('../constants');

const  findLastUserAnswer = user => {
  if (!user.history) { return undefined; }

  for(let i = user.history.length - 1; i >= 0; i--) {
    if (user.history[i].type === TYPE_ANSWER) {
      return user.history[i];
    }
  }

  return undefined;
};

const hasFinishedIntro = user =>
  R.pathOr(false, ['introConversationFinished'], user);

const hasBegunIntro = user =>
  R.pathOr(false, ['introConversationSeen'], user);

const isInvalidUser = user =>
  R.pathOr(false, ['invalidUser'], user);

const emptyUser = {
  history: [],
  progress: {
    prevMessage: '',
    nextMessage: ''
  }
};

const shouldArchiveUser = (user, currentTimeMs) => {
  if (!user || !user.history.length) return true;

  const lastAnswer = findLastUserAnswer(user);

  if (!lastAnswer) {
    return true;
  }

  let daysSinceLastActivity = Math.floor(
    (currentTimeMs - lastAnswer.timestamp) / 1000 / 60 / 60 /24
  );
  return daysSinceLastActivity > NUMBER_OF_DAYS_WITH_NO_ACTIVITY_BEFORE_ARCHIVING;
};

module.exports = {
  hasFinishedIntro,
  hasBegunIntro,
  isInvalidUser,
  emptyUser,
  shouldArchiveUser,
  findLastUserAnswer
};
