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
        return { text: 'test', quick_replies: message.quick_replies };
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
 * Construct Outgoing Messages
 * 
 * @param {String} action
 * @param {Array} messages
 * @param {Array} blocks
 * @param {Object} user
 * @return {Object} { messagesToSend, context, history, blockScope }
*/
function getMessagesForAction({ action, messages, blocks, user }) {
    let messagesToSend = [];
    let curr = messages.find(m => m.id === action);
    let context;

    let { blockScope, history } = user;

    while (curr !== null && curr !== undefined) {
        messagesToSend.push(makePlatformMessagePayload(curr.id, messages));
        history.push(curr);

        if (curr.type === 'question' || curr.isEnd === true) {
            context = Object.assign({}, curr);
        }

        if (curr.type === 'question') {
            break;
        }

        if (curr.isEnd === true) {
            blockScope.pop();

            if (blockScope.length > 0) {
                const currentBlock = blockScope[blockScope.length - 1];

                const pointerToNextBlock = history
                    .slice()
                    .reverse()
                    .find(m => m.block === currentBlock).next.afterBlock;

                curr = messages.find(m => m.id === pointerToNextBlock);
            } else {
                // done
                curr = null;
            }
        } else if (curr.next.id.indexOf('block') > -1) {
            blockScope.push(curr.next.id);

            const nextBlock = blocks.find(b => b.id === curr.next.id);
            curr = messages.find(m => m.id === nextBlock.startMessage);
        } else {
            curr = messages.find(m => m.id === curr.next.id);
        }
    }

    return { messagesToSend, context, history, blockScope };
}

module.exports = {
    getMessagesForAction,
    getActionForMessage
};
