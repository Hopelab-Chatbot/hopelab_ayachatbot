const { TYPE_BLOCK } = require('./constants');

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

    if (currentMessage.isEnd === true) {
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
    isNextMessageBlock
};
