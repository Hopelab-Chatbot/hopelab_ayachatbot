const { updateBlockScope, updateHistory } = require('./users');

/**
 * Create Specific Platform Payload
 * 
 * @param {String} action
 * @param {Array} messages
 * @return {Object}
*/
function makePlatformMessagePayload(action, messages) {
    const message = messages.find(m => m.id === action);

    if (message && message.quick_replies) {
        return { text: message.text, quick_replies: message.quick_replies };
    }

    return { text: message.text };
}

/**
 * Get the next Action for incoming message
 * 
 * @param {Object} message
 * @param {Object} user
 * @param {Array} blocks
 * @return {String}
*/
function getActionForMessage(message, user, blocks) {
    let action;

    if (message.quick_reply) {
        action = message.quick_reply.payload;
    } else {
        const lastMessage = user.history[user.history.length - 2];
        if (user.blockScope.length && lastMessage && lastMessage.next) {
            action = lastMessage.next.id;
        } else {
            // TODO: Logic for where to start/move user to next series/collection
            action = blocks.find(b => b.id === 'block-1').startMessage;
            user.blockScope.push('block-1');
        }
    }

    return action;
}

/**
 * Get Next Message
 * 
 * @param {Object} currentMessage
 * @param {Object} user
 * @param {Array} messages
 * @param {Array} blocks
 * @return {Object}
*/
function getNextMessage(curr, user, messages, blocks) {
    let next;

    const { blockScope, history } = user;

    if (curr.isEnd === true) {
        if (blockScope.length > 0) {
            const currentBlock = blockScope[blockScope.length - 1];

            const pointerToNextBlock = history
                .slice()
                .reverse()
                .find(m => m.block === currentBlock).next.afterBlock;

            next = messages.find(m => m.id === pointerToNextBlock);
        } else {
            // done
            next = null;
        }
    } else if (curr.next.id.indexOf('block') > -1) {
        const nextBlock = blocks.find(b => b.id === curr.next.id);
        next = messages.find(m => m.id === nextBlock.startMessage);
    } else {
        next = messages.find(m => m.id === curr.next.id);
    }

    return next;
}

/**
 * Construct Outgoing Messages
 * 
 * @param {String} action
 * @param {Array} messages
 * @param {Array} blocks
 * @param {Object} user
 * @return {Object}
*/
function getMessagesForAction({ action, messages, blocks, user }) {
    let messagesToSend = [];
    let curr = messages.find(m => m.id === action);

    let userToUpdate = Object.assign({}, user);

    const { blockScope, history } = userToUpdate;

    while (Object.keys(curr).length) {
        messagesToSend.push(makePlatformMessagePayload(curr.id, messages));

        // update block scope
        userToUpdate = Object.assign({}, userToUpdate, {
            blockScope: updateBlockScope(curr, userToUpdate.blockScope)
        });

        // update history
        userToUpdate = Object.assign({}, userToUpdate, {
            history: updateHistory(curr, userToUpdate.history)
        });

        // if it's a question
        if (curr.type === 'question') {
            break;
        }

        curr = Object.assign(
            {},
            getNextMessage(curr, userToUpdate, messages, blocks)
        );
    }

    return {
        messagesToSend,
        history: userToUpdate.history,
        blockScope: userToUpdate.blockScope
    };
}

module.exports = {
    makePlatformMessagePayload,
    getMessagesForAction,
    getActionForMessage,
    updateHistory,
    getNextMessage
};
