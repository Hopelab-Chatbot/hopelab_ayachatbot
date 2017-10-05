const { updateBlockScope, updateHistory } = require('./users');
const {
    TYPE_BLOCK,
    TYPE_IMAGE,
    TYPE_VIDEO,
    TYPE_QUESTION
} = require('./constants');

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
 * Create Specific Platform Media Payload
 *
 * @param {String} type
 * @param {String} url
 * @return {Object}
*/
function makePlatformMediaMessagePayload(type, url) {
    return {
        attachment: {
            type,
            payload: {
                url
            }
        }
    };
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
        // go back two because latest user reply has been added
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
                .find(
                    m =>
                        m.block === currentBlock &&
                        m.next &&
                        m.next.type === TYPE_BLOCK
                ).next.after;

            next = messages.find(m => m.id === pointerToNextBlock);
        } else {
            // done
            next = null;
        }
    } else if (curr.next.type === TYPE_BLOCK) {
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
 * @param {String} type
 * @param {Object} user
 * @param {Object} media
 * @return {String}
*/
function getMediaUrlForMessage(type, user, media) {
    // TODO: logic for determining content to show based on user history?
    return media[type][Math.floor(Math.random() * media[type].length)].url;
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
function getMessagesForAction({ action, messages, blocks, user, media }) {
    let messagesToSend = [];
    let curr = messages.find(m => m.id === action);

    let userToUpdate = Object.assign({}, user);

    while (Object.keys(curr).length) {
        if (curr.type === TYPE_IMAGE || curr.type === TYPE_VIDEO) {
            const url = getMediaUrlForMessage(curr.type, user, media);
            messagesToSend.push(
                makePlatformMediaMessagePayload(curr.type, url)
            );
        } else {
            messagesToSend.push(makePlatformMessagePayload(curr.id, messages));
        }

        // update block scope
        userToUpdate = Object.assign({}, userToUpdate, {
            blockScope: updateBlockScope(curr, userToUpdate.blockScope)
        });

        // update history
        userToUpdate = Object.assign({}, userToUpdate, {
            history: updateHistory(curr, userToUpdate.history)
        });

        // if it's a question
        if (curr.type === TYPE_QUESTION) {
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
    makePlatformMediaMessagePayload,
    getMessagesForAction,
    getActionForMessage,
    updateHistory,
    getNextMessage,
    getMediaUrlForMessage
};
