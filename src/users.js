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
    
    if (currentMessage.next && (currentMessage.next.id || '').indexOf('block') > -1) {
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

module.exports = {
    createNewUser,
    updateBlockScope,
    updateHistory
};
