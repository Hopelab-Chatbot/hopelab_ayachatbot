const {
  TYPE_BLOCK,
} = require('./constants');

const { emptyUser } = require('./utils/user_utils');

const R = require('ramda');

/**
 * Create New User
 *
 * @param {String} id
 * @return {Object}
*/
function createNewUser(id) {
  return Object.assign({},
    {id},
    emptyUser);
}

const hasStoppedNotifications = user => (
  R.pathOr(false, ['stopNotifications'], user)
);

/**
 * Update History with Message
 *
 * @param {Object} currentMessage
 * @param {Array} history
 * @return {Array}
*/

/**
 * Get Previous Message in User History
 *
 * @param {Object} messages
 * @param {Object} user
 * @return {Object}
*/
function getPreviousMessageInHistory(messages, user) {
  return (
    messages.find(
      m => m.id === (user.history[user.history.length - 1] || {}).id
    ) || {}
  );
}

/**
 * Get List of Child Entities Seen by User
 *
 * @param {String} id
 * @param {Object} user
 * @param {String} progressKey
 * @param {String} seenKey
 * @return {Array}
*/
function getChildEntitiesSeenByUserForParent(id, user, progressKey, seenKey) {
  return R.pathOr(
    [],
    [seenKey],
    R.find(R.propEq('id', id))(user[progressKey] || [])
  );
}

/**
 * Update the user's series progress for a collection
 *
 * @param {Object} user
 * @param {String} collectionId
 * @param {Array} seen
 * @param {String} progressKey
 * @param {String} seenKey
 * @return {Array}
*/
function updateProgressForEntity(user, id, seen, progressKey, seenKey) {
  const progress = user[progressKey] || [];
  const index = progress.findIndex(cp => cp.id === id);
  const isUnknownEntity = R.equals(-1);

  if (isUnknownEntity(index)) {
    return progress.concat({ id: id, [seenKey]: seen });
  }

  return progress.map((cp, i) => {
    return i === index ? Object.assign({}, cp, { [seenKey]: seen }) : cp;
  });
}

/**
 * Is Next Message a Block?
 *
 * @param {Object} message
 * @return {Boolean}
*/
function isNextMessageBlock(message) {
  return !!message.next && message.next.type === TYPE_BLOCK;
}

/**
 * Remove Last Scope Item
 *
 * @param {Object} user
 * @param {String} scopeId
 * @return {Object}
*/
function popScope(user, scopeId) {
  return R.over(R.lensProp(scopeId), R.init, user);
}

module.exports = {
  createNewUser,
  getPreviousMessageInHistory,
  getChildEntitiesSeenByUserForParent,
  isNextMessageBlock,
  updateProgressForEntity,
  popScope,
  hasStoppedNotifications,
};
