const format = require('string-template');
const { getBlocks, getMessages } = require('./database');

// create specific platform payload based upon message content
// TODO: Add any platform specific logic
function makeMessagePayload(action, messages) {
    const message = messages.find(m => m.id === action);

    if (message && message.quick_replies) {
        return { text: 'test', quick_replies: message.quick_replies };
    }

    return { text: message.text };
}

/**
 * Construct messages array
 * 
 * @param {String} action
 * @return {Object} { messages, context }
*/
function getMessagesForAction({ action, messages, blocks, blockScope, history }) {
    let messagesToSend = [];
    let curr = messages.find(m => m.id === action);
    let context;

    while (curr !== null && curr !== undefined) {
        messagesToSend.push(makeMessagePayload(curr.id, messages));
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
                let currentBlock = blockScope[blockScope.length - 1];

                const lastBlockMessage = history.slice().reverse().find(m => m.block === currentBlock).next.afterBlock;

                curr = messages.find(m => m.id === lastBlockMessage);
            } else {
                // done
                curr = null;
            }
        } else if (curr.next.id.indexOf('block') > -1) {
            blockScope.push(curr.next.id);
            const block = blocks.find(b => b.id === curr.next.id);
            curr = messages.find(m => m.id === block.startMessage);
        } else {
            curr = messages.find(m => m.id === curr.next.id);
        }
    }

    return { messagesToSend, context, history, blockScope };
}

module.exports = {
    getMessagesForAction
};