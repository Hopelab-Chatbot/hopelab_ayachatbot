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
    LOGIC_RANDOM,
    INTRO_CONVERSATION_ID,
    INTRO_BLOCK_ID,
    COLLECTION_PROGRESS,
    SERIES_PROGRESS,
    SERIES_SEEN,
    BLOCKS_SEEN,
    COLLECTION_SCOPE,
    BLOCK_SCOPE
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
 * Start a new Converation Track
 * 
 * @param {Array} messages
 * @param {Array} collections
 * @return {Object}
*/
function newConversationTrack(messages, collections) {
    const next = messages
        .concat(collections)
        .filter(e => e.parent && e.parent.id === INTRO_CONVERSATION_ID)
        .find(e => e.start === true);

    return {
        action: { type: next.type, id: next.id },
        block: INTRO_BLOCK_ID
    };
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
        // TODO: Quick Replies Pointing to Collections?
        action = { type: TYPE_MESSAGE, id: message.quick_reply.payload };
    } else {
        const lastMessage = getLastSentMessageInHistory(user);

        // TODO: Pickup After Collection

        if (user[BLOCK_SCOPE].length && lastMessage && lastMessage.next) {
            action = { type: lastMessage.next.type, id: lastMessage.next.id };
        } else {
            const newTrack = newConversationTrack(messages, collections);

            action = newTrack.action;
            user[BLOCK_SCOPE].push(newTrack.block);
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
        COLLECTION_PROGRESS,
        SERIES_SEEN
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
        SERIES_PROGRESS,
        BLOCKS_SEEN
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

    const { [BLOCK_SCOPE]: blockScope, history } = user;

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
 * Get Message for a Collection
 * 
 * @param {String} collectionId
 * @param {Array} collections
 * @param {Array} series
 * @param {Array} blocks
 * @param {Array} messages
 * @param {Object} userUpdates
 * @return {Object}
*/
function getNextMessageForCollection(
    collectionId,
    collections,
    series,
    blocks,
    messages,
    userUpdates
) {
    const collection = collections.find(c => c.id === collectionId);

    const {
        next: nextSeries,
        seenEntities: seriesSeen
    } = getNextSeriesForCollection(collection, series, userUpdates);

    const { next: nextBlock, seenEntities: blocksSeen } = getNextBlockForSeries(
        nextSeries,
        blocks,
        userUpdates
    );

    let user = Object.assign({}, userUpdates, {
        [COLLECTION_PROGRESS]: updateProgressForEntity(
            userUpdates,
            collection.id,
            seriesSeen,
            COLLECTION_PROGRESS,
            SERIES_SEEN
        ),
        [SERIES_PROGRESS]: updateProgressForEntity(
            userUpdates,
            nextSeries.id,
            blocksSeen,
            SERIES_PROGRESS,
            BLOCKS_SEEN
        )
    });

    const message = getFirstMessageForBlock(nextBlock.id, messages);

    // update block scope
    user = Object.assign({}, user, {
        [BLOCK_SCOPE]: updateBlockScope(message, user[BLOCK_SCOPE])
    });

    return {
        message,
        user
    };
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
    let curr;

    let userUpdates = Object.assign({}, user);

    if (action.type === TYPE_MESSAGE) {
        curr = messages.find(m => m.id === action.id);
    } else if (action.type === TYPE_COLLECTION) {
        let nextMessage = getNextMessageForCollection(
            action.id,
            collections,
            series,
            blocks,
            messages,
            userUpdates
        );

        curr = nextMessage.message;
        userUpdates = nextMessage.user;
    }

    while (curr) {
        if (
            curr.messageType === TYPE_IMAGE ||
            curr.messageType === TYPE_VIDEO
        ) {
            const url = getMediaUrlForMessage(curr.messageType, user, media);

            messagesToSend.push({
                type: TYPE_MESSAGE,
                message: makePlatformMediaMessagePayload(curr.messageType, url)
            });
        } else {
            messagesToSend.push({
                type: TYPE_MESSAGE,
                message: makePlatformMessagePayload(curr.id, messages)
            });
        }

        // update block scope
        userUpdates = Object.assign({}, userUpdates, {
            [BLOCK_SCOPE]: updateBlockScope(curr, userUpdates[BLOCK_SCOPE])
        });

        // TODO: Collection and Series?

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

            if (curr.next.type === TYPE_COLLECTION) {
                let nextMessage = getNextMessageForCollection(
                    curr.next.id,
                    collections,
                    series,
                    blocks,
                    messages,
                    userUpdates
                );

                curr = nextMessage.message;
                userUpdates = nextMessage.user;
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
