const R = require('ramda');
const {
  NUMBER_OF_DAYS_WITH_NO_ACTIVITY_BEFORE_ARCHIVING,
  TYPE_ANSWER,
  STUDY_ID_NO_OP
} = require('../constants');

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

const userIsStartingStudy = (oldUser, newUser) => {
  return !Number.isFinite(Number(R.path(['studyId'],oldUser))) &&
         Number.isFinite(Number(R.path(['studyId'], newUser)));
};

const studyIdIsNotificationEligable = user => {
  return Number.isFinite(Number(R.path(['studyId'], user))) &&
        Number(R.path(['studyId'], user)) !== STUDY_ID_NO_OP;
};

const updateHistory = (currentMessage, history) => {
  const historyToUpdate = history.slice();

  historyToUpdate.push(Object.assign({}, currentMessage));

  return historyToUpdate;
};

module.exports = {
  hasFinishedIntro,
  hasBegunIntro,
  isInvalidUser,
  emptyUser,
  shouldArchiveUser,
  findLastUserAnswer,
  userIsStartingStudy,
  studyIdIsNotificationEligable,
  updateHistory
};
