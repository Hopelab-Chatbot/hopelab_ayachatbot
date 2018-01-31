const {
    updateHistory,
    getChildEntitiesSeenByUserForParent,
    updateProgressForEntity,
    popScope
} = require('./users');
const {
    TYPE_COLLECTION,
    TYPE_BLOCK,
    TYPE_MESSAGE,
    TYPE_IMAGE,
    TYPE_VIDEO,
    TYPE_QUESTION,
    TYPE_ANSWER,
    TYPE_QUESTION_WITH_REPLIES,
    MESSAGE_TYPE_TEXT,
    ACTION_RETRY_QUICK_REPLY,
    ACTION_COME_BACK_LATER,
    ACTION_NO_UPDATE_NEEDED,
    END_OF_CONVERSATION_ID,
    QUICK_REPLY_RETRY_MESSAGE,
    END_OF_CONVERSATION_MESSAGE,
    UPDATE_USER_MESSAGE,
    LOGIC_SEQUENTIAL,
    LOGIC_RANDOM,
    INTRO_CONVERSATION_ID,
    INTRO_BLOCK_ID,
    COLLECTION_PROGRESS,
    SERIES_PROGRESS,
    SERIES_SEEN,
    BLOCKS_SEEN,
    COLLECTION_SCOPE,
    CUT_OFF_HOUR_FOR_NEW_MESSAGES,
    MINUTES_OF_INACTIVITY_BEFORE_UPDATE_MESSAGE,
} = require('./constants');

const R = require('ramda');

const moment = require('moment');

/**
 * Create Specific Platform Payload
 *
 * @param {String} action
 * @param {Array} messages
 * @return {Object}
*/
function makePlatformMessagePayload(action, messages) {
    const message = messages.find(m => m.id === action);

    if (message && message.messageType === TYPE_QUESTION_WITH_REPLIES &&
        message.quick_replies) {
        let quick_replies = message.quick_replies.map(qr => (
          qr.payload === undefined ?
            Object.assign({}, qr, {payload: "{}"}) :
            qr
        ));
        return { text: message.text, quick_replies };
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
    return type === 'image'
        ? {
              attachment: {
                  type,
                  payload: {
                      url
                  }
              }
          }
        : {
              attachment: {
                  type: 'template',
                  payload: {
                      template_type: 'open_graph',
                      elements: [{ url }]
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
    if (!(R.path(['history', 'length'], user))) { return undefined; }

    for (let i = user.history.length - 1; i >= 0; i--) {
        if (user.history[i].type !== TYPE_ANSWER) {
          return user.history[i];
        }
    }

    return undefined;
}


/**
 * Check if conversation is live and not the intro
 *
 * @param {Object} conversation
 * @return {Boolean}
*/
function conversationIsLiveAndNotIntro(conversation) {
    return conversation.isLive && conversation.id !== INTRO_CONVERSATION_ID;
}

/**
 * Get a random conversation track id
 *
 * @param {Array} conversations
 * @return {String}
*/
function getRandomConversationId(conversations) {
    return R.prop(
        'id',
        conversations[Math.floor(Math.random() * conversations.length)]
    );
}

/**
 * Get a random conversation track (not including intro)
 *
 * @param {Array} conversations
 * @return {String}
*/
function getRandomConversationTrack(conversations) {
    return getRandomConversationId(
        conversations.filter(conversationIsLiveAndNotIntro)
    );
}

/**
 * Check if the assigned conversation track is gone
 *
 * @param {String} conversation
 * @param {Array} conversations
 * @return {Boolean}
*/
function assignedConversationTrackIsDeleted(conversation, conversations) {
    return conversations.indexOf(conversation) === -1;
}

/**
 * Start a new Converation Track
 *
 * @param {Array} conversations
 * @param {Array} messages
 * @param {Array} collections
 * @param {Object} user
 * @return {Object}
*/
function newConversationTrack(conversations, messages, collections, user) {
    let conversationTrack;

    if (!user.introConversationSeen) {
        conversationTrack = INTRO_CONVERSATION_ID;
        user.introConversationSeen = true;
    } else if (
        !user.assignedConversationTrack ||
        assignedConversationTrackIsDeleted(
            user.assignedConversationTrack,
            conversations
        )
    ) {
        user.assignedConversationTrack = getRandomConversationTrack(
            conversations
        );
        conversationTrack = user.assignedConversationTrack;
    } else {
        conversationTrack = user.assignedConversationTrack;
    }

    const next = messages
        .concat(collections)
        .find(
            R.both(
                R.pathEq(['parent', 'id'], conversationTrack),
                R.propEq('start', true)
            )
        );

    return {
        action: { type: next.type, id: next.id },
        block: INTRO_BLOCK_ID,
        user
    };
}

function findLastUserAnswer(user) {
  if (!user.history) { return undefined; }

  for(let i = user.history.length - 1; i >= 0; i--) {
    if (user.history[i].type === TYPE_ANSWER) {
      return user.history[i];
    }
  }

  return undefined;
}

function findLastNonConversationEndMessage(user) {
  if (!user.history) { return undefined; }

  for(let i = user.history.length - 1; i >= 0; i--) {
    if (
      user.history[i].id !== END_OF_CONVERSATION_ID &&
      user.history[i].type !== TYPE_ANSWER
    ) {
      return user.history[i];
    }
  }

  return undefined;
}

function hasUpdateSinceLastAnswer(user, lastAnswer) {
  if (!lastAnswer) { return false; }
  if (!user.history) { return false; }

  for(let i = user.history.length - 1; i >= 0; i--) {
    if (user.history[i].isUpdate) {
      return user.history[i].timestamp > lastAnswer.timestamp;
    }
  }

  return false;
}

function atEndOfConversationAndShouldRestart(user, timeNow, cutOffHour, cutOffMinute=0) {
    const lastMessage = getLastSentMessageInHistory(user);

    if (R.path(['next', 'id'], lastMessage) !== END_OF_CONVERSATION_ID) {
        return false;
    }
    const lastRealMessage = findLastNonConversationEndMessage(user);
    if (lastRealMessage) {
        let cutOffTime = moment().startOf('day').hour(cutOffHour).minute(cutOffMinute).unix();
        if (timeNow < cutOffTime) {
            cutOffTime = moment().subtract(1, 'day').startOf('day').hour(cutOffHour).minute(cutOffMinute).unix();
        }

        return (
          (timeNow > cutOffTime) &&
          (cutOffTime * 1000 > lastRealMessage.timestamp)
        );
    }

    return false;

}

function shouldReceiveUpdate(user) {
    const lastAnswer = findLastUserAnswer(user);

    if (hasUpdateSinceLastAnswer(user, lastAnswer)) {
      return false;
    }

    let minutesSinceLastActivity = Math.floor(
      (Date.now() - lastAnswer.timestamp) / 1000 / 60
    );

    return minutesSinceLastActivity > MINUTES_OF_INACTIVITY_BEFORE_UPDATE_MESSAGE;
}

function getUserUpdateAction({
  user,
  conversations,
  messages,
  collections,
}) {
  let userActionUpdates = Object.assign({}, user);
  if (shouldReceiveUpdate(user)) {
    const newTrack = newConversationTrack(
        conversations,
        messages,
        collections,
        user
    );

    let action = newTrack.action;

    userActionUpdates = Object.assign({}, userActionUpdates);

    return {
      action,
      userActionUpdates
    };
  } else {
    return {
      action: {type: ACTION_NO_UPDATE_NEEDED }
    };
  }
}

function getUpdateActionForUsers({
  users,
  allConversations,
  allCollections,
  allMessages,
  allSeries,
  allBlocks,
  media
}) {
  return users.reduce((acc, user) => {
    let {action, userActionUpdates} = getUserUpdateAction({
      user,
      conversations: allConversations,
      messages: allMessages,
      collections: allCollections,
    });
    if (action.type !== ACTION_NO_UPDATE_NEEDED) {
      acc.push({action, userActionUpdates});
    };
    return acc;
  }, []);
}

/**
 * Get the next Action for incoming message
 *
 * @param {Object} message
 * @param {Object} user
 * @param {Array} blocks
 * @param {Array} series
 * @param {Array} collections
 * @param {Array} conversations
 * @param {Array} messages
 * @return {Object}
*/
function getActionForMessage({
    message,
    user,
    blocks,
    series,
    messages,
    collections,
    conversations
}) {
    let userActionUpdates = user;


    const lastMessage = getLastSentMessageInHistory(user);

    if (
      R.path(['next', 'id'], lastMessage) === END_OF_CONVERSATION_ID &&
      atEndOfConversationAndShouldRestart(user, moment().unix(), CUT_OFF_HOUR_FOR_NEW_MESSAGES)
    ) {
      const newTrack = newConversationTrack(
          conversations,
          messages,
          collections,
          user
      );

      let action = newTrack.action;

      userActionUpdates = Object.assign({}, userActionUpdates);

      return {
        action,
        userActionUpdates
      };
    }

    if (R.path(['next', 'id'], lastMessage) === END_OF_CONVERSATION_ID) {
      return {
        action: { type: ACTION_COME_BACK_LATER },
        userActionUpdates
      };
    }

    if (
      R.path(['messageType'], lastMessage) === TYPE_QUESTION_WITH_REPLIES &&
      !!message.quick_reply
    ) {
      let action = JSON.parse(message.quick_reply.payload);
      if (action.id === END_OF_CONVERSATION_ID) {
        return {
          action: {type: ACTION_COME_BACK_LATER},
          userActionUpdates
        };
      }

      if (!!action.id) {
        return {
            action,
            userActionUpdates
        };
      }
    }

    if (
      R.path(['messageType'], lastMessage) === TYPE_QUESTION_WITH_REPLIES &&
      !message.quick_reply
    ) {
        return {
          action: {type: ACTION_RETRY_QUICK_REPLY},
          userActionUpdates
        };
    }

    let action;


    if (
        lastMessage &&
        R.path(['next'], lastMessage)
    ) {
        action = { type: lastMessage.next.type, id: lastMessage.next.id };
    } else if (user[COLLECTION_SCOPE] && user[COLLECTION_SCOPE].length) {
        let nextMessage = getNextMessageForCollection(
            R.last(user[COLLECTION_SCOPE]),
            collections,
            series,
            blocks,
            messages,
            userActionUpdates
        );

        action = {
            type: nextMessage.message.type,
            id: nextMessage.message.id
        };
        userActionUpdates = nextMessage.user;
    } else {
        const newTrack = newConversationTrack(
            conversations,
            messages,
            collections,
            user
        );

        action = newTrack.action;

        userActionUpdates = Object.assign({}, userActionUpdates);
    }

    return { action, userActionUpdates };
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
    if (!totalEntities.length) {
        return { next: {}, seenEntities: [] };
    }

    if ((totalEntities.length === seenEntities.length) || (seenEntities.length > totalEntities.length)) {
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
    if (!totalEntities.length) {
        return { next: {}, seenEntities: [] };
    }

    const first = totalEntities[0] || {};

    if ((totalEntities.length === seenEntities.length) || (seenEntities.length > totalEntities.length)) {
        return { next: first, seenEntities: [first.id] };
    }

    const lastSeen = totalEntities.findIndex(
        entity => entity.id === R.nth(0, R.takeLast(1, seenEntities))
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

    const {
        [COLLECTION_SCOPE]: collectionScope,
        history
    } = user;

    if (curr.next && curr.next.type === TYPE_BLOCK) {
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
    const parentIdMatchesBlockId = R.pathEq(['parent', 'id'], blockId);
    const isNotPrivate = R.compose(R.not, R.prop('private'));
    const isStart = R.propEq('start', true);
    const isValidMessage = R.allPass([
        parentIdMatchesBlockId,
        isNotPrivate,
        isStart
    ]);

    return R.compose(R.head, R.filter(isValidMessage))(messages);
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

    userUpdates = Object.assign({}, userUpdates, {
        [COLLECTION_SCOPE]: (userUpdates[COLLECTION_SCOPE] || []).concat(
            collectionId
        )
    });

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

    return {
        message,
        user
    };
}

function createCustomMessageForHistory({
  id,
  type,
  messageType,
  next,
  text
}) {
  return {
    id,
    type,
    messageType,
    next,
    text,
    timestamp: Date.now()
  }
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

    if (action.type === ACTION_RETRY_QUICK_REPLY) {
      const updateMessage = QUICK_REPLY_RETRY_MESSAGE;
      curr = {
          type: TYPE_MESSAGE,
          message: { text: updateMessage }
      };

      messagesToSend.push(curr);

      curr = createCustomMessageForHistory({
          type: TYPE_MESSAGE,
          messageType: MESSAGE_TYPE_TEXT,
          text: curr.message.text,
      });

      userUpdates = R.merge(userUpdates, {
          history: updateHistory(
              R.merge(curr, {
                  timestamp: Date.now()
              }),
              userUpdates.history
          )
      });
      curr = Object.assign({}, getLastSentMessageInHistory(user));
    } else if (action.type === ACTION_COME_BACK_LATER) {
      curr = {
          type: TYPE_MESSAGE,
          message: { text: END_OF_CONVERSATION_MESSAGE },
      };
      messagesToSend.push(curr);

      curr = createCustomMessageForHistory({
          id: END_OF_CONVERSATION_ID,
          type: TYPE_MESSAGE,
          messageType: MESSAGE_TYPE_TEXT,
          text: curr.message.text,
          next: {id: END_OF_CONVERSATION_ID }
      });
      userUpdates = R.merge(userUpdates, {
          history: updateHistory(
              R.merge(curr, {
                  timestamp: Date.now()
              }),
              userUpdates.history
          )
      });
      curr = null;
    } else if (action.type === TYPE_MESSAGE) {
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
            messagesToSend.push({
                type: TYPE_MESSAGE,
                message: makePlatformMediaMessagePayload(
                    curr.messageType,
                    curr.url
                )
            });
        } else {
            messagesToSend.push({
                type: TYPE_MESSAGE,
                message: makePlatformMessagePayload(curr.id, messages)
            });
        }

        userUpdates = R.merge(userUpdates, {
            history: updateHistory(
                R.merge(curr, {
                    timestamp: Date.now()
                }),
                userUpdates.history
            )
        });

        if (
            curr.messageType === TYPE_QUESTION ||
            curr.messageType === TYPE_QUESTION_WITH_REPLIES
        ) {
            break;
        }

        if (curr.next && curr.next.id !== END_OF_CONVERSATION_ID) {
            if (curr.next.type === TYPE_MESSAGE) {
                curr = Object.assign(
                    {},
                    getNextMessage(curr, userUpdates, messages, blocks)
                );
            } else if (curr.next.type === TYPE_COLLECTION) {
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
            if (
                userUpdates[COLLECTION_SCOPE] &&
                userUpdates[COLLECTION_SCOPE].length
            ) {
                const collectionScopeLeavingId =
                    userUpdates[COLLECTION_SCOPE][
                        userUpdates[COLLECTION_SCOPE].length - 1
                    ];

                const collectionScopeLeaving = collections.find(
                    c => c.id === collectionScopeLeavingId
                );

                if (
                    R.pathEq(
                        ['next', 'type'],
                        TYPE_COLLECTION,
                        collectionScopeLeaving || {}
                    )
                ) {
                    userUpdates = popScope(userUpdates, COLLECTION_SCOPE);

                    let nextMessage = getNextMessageForCollection(
                        collectionScopeLeaving.next.id,
                        collections,
                        series,
                        blocks,
                        messages,
                        userUpdates
                    );

                    curr = nextMessage.message;
                    userUpdates = nextMessage.user;
                } else if (
                    R.pathEq(
                        ['next', 'type'],
                        TYPE_MESSAGE,
                        collectionScopeLeaving || {}
                    )
                ) {
                    curr = messages.find(
                        m => m.id === collectionScopeLeaving.next.id
                    );
                    userUpdates = popScope(userUpdates, COLLECTION_SCOPE);
                } else {
                    curr = null;
                    userUpdates = popScope(userUpdates, COLLECTION_SCOPE);
                }
            } else {
                curr = null;
            }
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
    getUpdateActionForUsers,
    updateHistory,
    getNextMessage,
    getMediaUrlForMessage
};
