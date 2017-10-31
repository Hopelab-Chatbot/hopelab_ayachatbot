const { TYPE_BLOCK } = require('./constants');

const R = require('ramda');

/**
 * Create New User
 * 
 * @param {String} id
 * @return {Object}
*/
function createNewUser(id) {
    return {
        id,
        blockScope: [],
        history: [],
        progress: {
            prevMessage: '',
            nextMessage: ''
        }
    };
}

/**
 * Update Block Scope
 * 
 * @param {Object} currentMessage
 * @param {Array} blockScope
 * @return {Array}
*/
function updateBlockScope(currentMessage, blockScope) {
    const blockScopeToUpdate = blockScope.slice();

    if (currentMessage.isEnd === true || !currentMessage.next) {
        blockScopeToUpdate.pop();
    }

    if (isNextMessageBlock(currentMessage)) {
        blockScopeToUpdate.push(currentMessage.next.id);
    }

    return blockScopeToUpdate;
}

/**
 * Update History with Message
 * 
 * @param {Object} currentMessage
 * @param {Array} history
 * @return {Array}
*/
function updateHistory(currentMessage, history) {
    const historyToUpdate = history.slice();

    historyToUpdate.push(Object.assign({}, currentMessage));

    return historyToUpdate;
}

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
 * Get List of Series Seen By User for a Collection
 * 
 * @param {String} collectionId
 * @param {Object} user
 * @return {Array}
*/
function getSeriesSeenByUserForCollection(collectionId, user) {
    return R.pathOr(
        [],
        ['seriesSeen'],
        R.find(R.propEq('id', collectionId))(user.collectionProgress || [])
    );
}

/**
 * Update the user's series progress for a collection
 * 
 * @param {Object} user
 * @param {String} collectionId
 * @param {Array} seriesSeen
 * @return {Array}
*/
function updateCollectionProgress(user, collectionId, seriesSeen) {
    const collectionProgress = user.collectionProgress || [];
    const collectionIndex = collectionProgress.findIndex(
        cp => cp.id === collectionId
    );

    if (collectionIndex === -1) {
        return collectionProgress.concat({ id: collectionId, seriesSeen });
    }

    return collectionProgress.map((cp, i) => {
        return i === collectionIndex
            ? Object.assign({}, cp, { seriesSeen })
            : cp;
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

module.exports = {
    createNewUser,
    updateBlockScope,
    updateHistory,
    getPreviousMessageInHistory,
    getSeriesSeenByUserForCollection,
    isNextMessageBlock,
    updateCollectionProgress
};
