const {
    updateBlockScope,
    updateHistory,
    getChildEntitiesSeenByUserForParent,
    updateProgressForEntity
} = require('./users');
const {
    TYPE_COLLECTION,
    TYPE_BLOCK,
    TYPE_MESSAGE,
    TYPE_IMAGE,
    TYPE_VIDEO,
    TYPE_QUESTION,
    LOGIC_SEQUENTIAL,
    LOGIC_RANDOM
} = require('./constants');

const R = require('ramda');

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
 * Get the last message sent to user in history
 * 
 * @param {Object} user
 * @return {Object}
*/
function getLastSentMessageInHistory(user) {
    return user.history[user.history.length - 2];
}

/**
 * Get the next Action for incoming message
 * 
 * @param {Object} message
 * @param {Object} user
 * @param {Array} blocks
 * @param {Array} collections
 * @param {Array} messages
 * @return {String}
*/
function getActionForMessage({ message, user, messages, collections }) {
    let action;

    if (message.quick_reply) {
        action = message.quick_reply.payload;
    } else {
        const lastMessage = getLastSentMessageInHistory(user);

        if (user.blockScope.length && lastMessage && lastMessage.next) {
            action = lastMessage.next.id;
        } else {
            const next = messages
                .concat(collections)
                .filter(e => e.parent && e.parent.id === 'intro-conversation')
                .find(e => e.start === true);

            // TODO: Logic for where to start/move user to next series/collection
            action = next.id;
            user.blockScope.push('intro-block');
        }
    }

    return action;
}

/**
 * Get All Public Children Whose Parent Matches ID
 * 
 * @param {String} id
 * @param {Array} children
 * @return {Array}
*/
function getAllPublicChildren(id, children) {
    return children.filter(s => !s.private && s.parent.id === id);
}

/**
 * Get Next Random Entity
 * 
 * @param {Array} totalEntities
 * @param {Array} seenEntities
 * @return {Object}
*/
function getNextRandomEntityFor(totalEntities, seenEntities) {
    if (totalEntities.length === seenEntities.length) {
        const next =
            totalEntities[Math.floor(totalEntities.length * Math.random())];
        return { next, seenEntities: [next.id] };
    }

    const left = totalEntities.filter(t => seenEntities.indexOf(t.id) === -1);
    const next = left[Math.floor(left.length * Math.random())];

    return { next, seenEntities: seenEntities.concat(next.id) };
}

/**
 * Get Next Sequential Entity
 * 
 * @param {Array} totalEntities
 * @param {Array} seenEntities
 * @return {Object}
*/
function getNextSequentialEntityFor(totalEntities, seenEntities) {
    const first = totalEntities[0] || {};

    if (totalEntities.length === seenEntities.length) {
        // start over at random
        return { next: first, seenEntities: [first.id] };
    }

    const lastSeen = totalEntities.findIndex(
        t => t.id === R.nth(0, R.takeLast(1, seenEntities))
    );

    if (lastSeen === totalEntities.length - 1) {
        return { next: first, seenEntities: [first.id] };
    }

    const next = totalEntities[lastSeen + 1];

    return { next, seenEntities: seenEntities.concat(next.id) };
}

/**
 * Get Next Message For a Collection
 * 
 * @param {Object} collection
 * @param {Array} series
 * @param {Object} user
 * @return {Object}
*/
function getNextSeriesForCollection(collection, series, user) {
    const collectionSeries = getAllPublicChildren(collection.id, series);

    const seriesSeen = getChildEntitiesSeenByUserForParent(
        collection.id,
        user,
        'collectionProgress',
        'seriesSeen'
    );

    if (collection.rule === LOGIC_RANDOM) {
        return getNextRandomEntityFor(collectionSeries, seriesSeen);
    }

    if (collection.rule === LOGIC_SEQUENTIAL) {
        return getNextSequentialEntityFor(collectionSeries, seriesSeen);
    }

    return {};
}

/**
 * Get Next Block For a Series
 * 
 * @param {Object} collection
 * @param {Array} series
 * @param {Object} user
 * @return {Object}
*/
function getNextBlockForSeries(series, blocks, user) {
    const seriesBlocks = getAllPublicChildren(series.id, blocks);

    const blocksSeen = getChildEntitiesSeenByUserForParent(
        series.id,
        user,
        'seriesProgress',
        'blocksSeen'
    );

    if (series.rule === LOGIC_RANDOM) {
        return getNextRandomEntityFor(seriesBlocks, blocksSeen);
    }

    if (series.rule === LOGIC_SEQUENTIAL) {
        return getNextSequentialEntityFor(seriesBlocks, blocksSeen);
    }

    return {};
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

    if (curr.isEnd === true || !curr.next) {
        if (blockScope.length > 0) {
            const currentBlock = blockScope[blockScope.length - 1];

            const lastCurrentBlockMessageInHistory = history
                .slice()
                .reverse()
                .find(
                    m =>
                        m.block === currentBlock &&
                        m.next &&
                        m.next.type === TYPE_BLOCK
                );

            if (
                !lastCurrentBlockMessageInHistory ||
                !lastCurrentBlockMessageInHistory.next
            ) {
                return;
            }

            // TODO: revisit this, maybe make this simpler
            const pointerToNextBlock =
                lastCurrentBlockMessageInHistory.next.after;

            next = messages.find(m => m.id === pointerToNextBlock);
        } else {
            // done
            next = null;
        }
    } else if (curr.next && curr.next.type === TYPE_BLOCK) {
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
 * @param {String} blockId
 * @param {Array} messages
 * @return {Object}
*/
function getFirstMessageForBlock(blockId, messages) {
    return R.pathOr(
        {},
        ['0'],
        messages.filter(
            m => m.parent && m.parent.id === blockId && !m.private && m.start
        )
    );
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
 * @param {Array} collections
 * @param {Array} series
 * @param {Array} messages
 * @param {Array} blocks
 * @param {Object} user
 * @return {Object}
*/
function getMessagesForAction({
    action,
    collections,
    series,
    messages,
    blocks,
    user,
    media
}) {
    let messagesToSend = [];
    let curr = messages.find(m => m.id === action);

    let userUpdates = Object.assign({}, user);

    while (curr) {
        if (
            curr.messageType === TYPE_IMAGE ||
            curr.messageType === TYPE_VIDEO
        ) {
            const url = getMediaUrlForMessage(curr.messageType, user, media);

            messagesToSend.push({
                type: 'message',
                message: makePlatformMediaMessagePayload(curr.messageType, url)
            });
        } else {
            messagesToSend.push({
                type: 'message',
                message: makePlatformMessagePayload(curr.id, messages)
            });
        }

        // update block scope
        userUpdates = Object.assign({}, userUpdates, {
            blockScope: updateBlockScope(curr, userUpdates.blockScope)
        });

        // update history
        userUpdates = Object.assign({}, userUpdates, {
            history: updateHistory(curr, userUpdates.history)
        });

        // if it's a question
        if (curr.messageType === TYPE_QUESTION) {
            break;
        }

        if (curr.next) {
            if (curr.next.type === TYPE_MESSAGE) {
                curr = Object.assign(
                    {},
                    getNextMessage(curr, userUpdates, messages, blocks)
                );
            }

            if (curr.next && curr.next.type === TYPE_COLLECTION) {
                const collection = collections.find(c => c.id === curr.next.id);

                const {
                    next: nextSeries,
                    seenEntities: seriesSeen
                } = getNextSeriesForCollection(collection, series, userUpdates);

                const {
                    next: nextBlock,
                    seenEntities: blocksSeen
                } = getNextBlockForSeries(nextSeries, blocks, userUpdates);

                userUpdates = Object.assign({}, userUpdates, {
                    collectionProgress: updateProgressForEntity(
                        userUpdates,
                        collection.id,
                        seriesSeen,
                        'collectionProgress',
                        'seriesSeen'
                    ),
                    seriesProgress: updateProgressForEntity(
                        userUpdates,
                        nextSeries.id,
                        blocksSeen,
                        'seriesProgress',
                        'blocksSeen'
                    )
                });

                curr = getFirstMessageForBlock(nextBlock.id, messages);

                // update block scope
                userUpdates = Object.assign({}, userUpdates, {
                    blockScope: updateBlockScope(curr, userUpdates.blockScope)
                });
            }
        } else {
            curr = null;
        }
    }

    return {
        messagesToSend,
        userUpdates
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
