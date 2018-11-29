const {
  getChildEntitiesSeenByUserForParent,
  updateProgressForEntity,
  popScope,
  hasStoppedNotifications,
} = require('./users');

const {
  logEvent
} = require('./events');

const {
  hasFinishedIntro,
  hasBegunIntro,
  findLastUserAnswer,
  updateHistory,
  userIsStartingStudy,
  studyIdIsNotificationEligable,
} = require('./utils/user_utils');

const {
  getLastSentMessageInHistory,
  formatAsEventName,
  createCustomMessageForHistory
} = require('./utils/msg_utils');

const {
  newConversationTrack,
  conversationIsLiveAndNotIntro,
} = require('./conversations');

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
  MESSAGE_TYPE_TRANSITION,
  ACTION_RETRY_QUICK_REPLY,
  ACTION_COME_BACK_LATER,
  ACTION_NO_UPDATE_NEEDED,
  ACTION_CRISIS_REPONSE,
  ACTION_QUICK_REPLY_RETRY_NEXT_MESSAGE,
  ACTION_REPLAY_PREVIOUS_MESSAGE,
  END_OF_CONVERSATION_ID,
  QUICK_REPLY_RETRY_ID,
  CRISIS_RESPONSE_MESSAGE_ID,
  LOGIC_SEQUENTIAL,
  LOGIC_RANDOM,
  COLLECTION_PROGRESS,
  SERIES_PROGRESS,
  SERIES_SEEN,
  BLOCKS_SEEN,
  COLLECTION_SCOPE,
  NUMBER_OF_UPDATE_MESSAGES_ALLOWED,
  MINUTES_OF_INACTIVITY_BEFORE_UPDATE_MESSAGE,
  STUDY_MESSAGES,
  RESET_USER_RESPONSE_TYPE,
  RESET_USER_KEY_RESPONSE,
  RESET_USER_QUESTION,
  RESET_USER_CONFIRM,
  FB_EVENT_COMPLETE_INTRO_CONVERSATION,
  TYPE_BACK_TO_CONVERSATION,
  TYPE_SERIES,
} = require('./constants');

const R = require('ramda');

const { logger } = require('./logger');

const moment = require('moment');

/**
 * Create Specific Platform Payload
 *
 * @param {String} action
 * @param {Array} messages
 * @return {Object}
*/
function makePlatformMessagePayload(id, messages, includedMessage) {
  const message = includedMessage || messages.find(m =>  m.id === id);
  if (message && message.messageType === TYPE_QUESTION_WITH_REPLIES &&
        message.quick_replies) {
    let quick_replies = message.quick_replies.map(qr => (
      qr.payload === undefined ?
        Object.assign({}, R.omit(['next'], qr), {payload: qr.next ? JSON.stringify(qr.next) : "{}"}) :
        R.omit(['next'], {...qr, payload: JSON.stringify({ ...JSON.parse(qr.payload), ...qr.next }) })
    ));
    return { text: message.text, quick_replies };
  }

  return { text: message.text };
}


function isYouTubeVideo(url) {
  return url && url.includes("www.youtube.com");
}

function getMediaAttachmentId(type, url, media) {
  if (R.path([type], media) && Array.isArray(media[type])) {
    return R.path(['attachment_id'], media[type].find(m => m.url === url));
  }
  return undefined;
}

/**
 * Create Specific Platform Media Payload
 *
 * @param {String} type
 * @param {String} url
 * @return {Object}
*/
function makePlatformMediaMessagePayload(type, url, media) {
  const attachment_id = getMediaAttachmentId(type, url, media);
  const is_reusable = true;
  if (attachment_id) {
    return {
      attachment: {
        type,
        payload: {
          attachment_id,
        }
      }
    };
  } else if (type === 'image' || !isYouTubeVideo(url)) {
    return  {
      attachment: {
        type,
        payload: { url: encodeURI(url), is_reusable }
      }
    };
  } else {
    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'open_graph',
          elements: [{ url: encodeURI(url), is_reusable }]
        }
      }
    };
  }
}



function hasUpdateSinceInactivity(user, lastAnswer, minutesOfInactivityBeforeUpdate) {
  if (!lastAnswer) { return false; }
  if (!user.history) { return false; }

  const inactivityInterval = moment().subtract(minutesOfInactivityBeforeUpdate, 'minute').unix() * 1000;

  for(let i = user.history.length - 1; i >= 0; i--) {
    if (user.history[i].isUpdate) {
      return (
        user.history[i].timestamp > lastAnswer.timestamp &&
        user.history[i].timestamp > inactivityInterval
      );
    }
  }

  return false;
}



//TODO: could rewrite this using reduce
function hasExceededMaxUpdates(user, maxUpdates) {
  let updates = 0;
  for (var i = user.history.length - 1; i >= 0; i--) {
    if (user.history[i].type === TYPE_ANSWER) { break; }
    if (user.history[i].isUpdate) { updates++; }
  }

  return updates >= maxUpdates;
}

function shouldReceiveUpdate(user, currentTimeMs) {
  if (!Array.isArray(R.path(['history'], user))) {
    return false;
  }

  if (hasStoppedNotifications(user)){
    return false;
  }

  const lastAnswer = findLastUserAnswer(user);

  if (!lastAnswer) {
    return false;
  }

  if (hasUpdateSinceInactivity(user, lastAnswer, MINUTES_OF_INACTIVITY_BEFORE_UPDATE_MESSAGE)) {
    return false;
  }

  if (hasExceededMaxUpdates(user, NUMBER_OF_UPDATE_MESSAGES_ALLOWED)) {
    return false;
  }

  if (R.path(['invalidUser'], user) === true) {
    return false;
  }
  let minutesSinceLastActivity = Math.floor(
    (currentTimeMs - lastAnswer.timestamp) / 1000 / 60
  );
  return minutesSinceLastActivity > MINUTES_OF_INACTIVITY_BEFORE_UPDATE_MESSAGE;
}

function getUserUpdateAction({
  user,
  conversations,
  messages,
  collections,
  studyInfo
}) {
  let userActionUpdates = Object.assign({}, user);

  if (shouldReceiveUpdate(user, Date.now())) {
    let convoOptions = conversations.filter(conversationIsLiveAndNotIntro);
    if (R.path(['assignedConversationTrack'], user)) {
      convoOptions = conversations.filter(
        c => c.id === user.assignedConversationTrack
      );
    }

    const newTrack = newConversationTrack(
      convoOptions,
      messages,
      collections,
      studyInfo,
      user
    );


    let action = newTrack.action;

    userActionUpdates = Object.assign({}, userActionUpdates, newTrack.user);

    logger.log('debug', `About to return an action for update ${JSON.stringify(action)}`);
    return {
      action,
      userActionUpdates
    };

  } else {
    logger.log('debug', `About to return a no op for an action`);
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
  studyInfo,
  maxUpdates
}) {
  return users.reduce((acc, user) => {
    let {action, userActionUpdates} = getUserUpdateAction({
      user,
      conversations: allConversations,
      messages: allMessages,
      collections: allCollections,
      studyInfo
    });
    if (action.type !== ACTION_NO_UPDATE_NEEDED && acc.length < maxUpdates) {
      acc.push({action, userActionUpdates});
    }
    return acc;
  }, []);
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

const getNextConversation = (
  {
    curr,
    userUpdates,
    messagesToSend,
    conversations,
    messages,
    collections,
    studyInfo,
    series,
    blocks,
  }
) => {

  let conversationsForNewTrack = [];
  if (R.path(['nextConversations', 'length'], curr) > 0) {
    conversationsForNewTrack = curr.nextConversations.map(nC =>
      conversations.find(c => c.id === nC.id)
    ).filter(nc => !!nc);
  }
  // here we mark this user as having completed the intro conversation,
  // so we can send push messages to them
  if (hasBegunIntro(userUpdates) && !hasFinishedIntro(userUpdates)) {
    logEvent({ userId: userUpdates.id, eventName: FB_EVENT_COMPLETE_INTRO_CONVERSATION });
    const updates = { introConversationFinished: true};
    userUpdates = Object.assign({}, userUpdates, updates);
  }
  const newTrack = newConversationTrack(
    conversationsForNewTrack,
    messages,
    collections,
    studyInfo,
    userUpdates
  );

  const transition = curr.nextConversations.find(nC => (
    nC.id === newTrack.user.assignedConversationTrack
  ));
  if (R.path(['text'], transition)) {
    messagesToSend.push({
      type: TYPE_MESSAGE,
      message: { text: transition.text }
    });

    let messageForHistory = createCustomMessageForHistory({
      id: transition.id,
      type: TYPE_MESSAGE,
      messageType: MESSAGE_TYPE_TEXT,
      text: transition.text
    });
    newTrack.user = R.merge(newTrack.user, {
      history: updateHistory(
        R.merge(messageForHistory, {
          timestamp: Date.now()
        }),
        userUpdates.history
      )
    }
    );
  }

  if (
    userIsStartingStudy(userUpdates, R.path(['user'], newTrack)) &&
        studyIdIsNotificationEligable(R.path(['user'], newTrack))
  ) {
    const text = STUDY_MESSAGES[0].text.replace(/XXXXX/, newTrack.user.studyId);
    messagesToSend.push({
      type: TYPE_MESSAGE,
      message: { text }
    });

    let messageForHistory = createCustomMessageForHistory({
      type: TYPE_MESSAGE,
      messageType: MESSAGE_TYPE_TEXT,
      text: text
    });
    newTrack.user = R.merge(newTrack.user, {
      history: updateHistory(
        R.merge(messageForHistory, {
          timestamp: Date.now()
        }),
        userUpdates.history
      )
    }
    );
  }

  if (newTrack.action.type === TYPE_COLLECTION) {
    let nextMessage = getNextMessageForCollection(
      newTrack.action.id,
      collections,
      series,
      blocks,
      messages,
      newTrack.user
    );

    curr = nextMessage.message;
    userUpdates = nextMessage.user;
  } else {
    curr = messages.find(m => m.id === newTrack.action.id);
    userUpdates = Object.assign({}, userUpdates, newTrack.user);
  }
  return { curr, userUpdates, messagesToSend };
};

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
  if (collection.isEvent) {
    logEvent({eventName: formatAsEventName(collection.name, TYPE_COLLECTION), userId: userUpdates.id });
  }
  userUpdates = Object.assign({}, userUpdates, {
    [COLLECTION_SCOPE]: (userUpdates[COLLECTION_SCOPE] || []).concat(
      collectionId
    )
  });

  const {
    next: nextSeries,
    seenEntities: seriesSeen
  } = getNextSeriesForCollection(collection, series, userUpdates);

  if (nextSeries.isEvent) {
    logEvent({eventName: formatAsEventName(nextSeries.name, TYPE_SERIES), userId: userUpdates.id });
  }

  const { next: nextBlock, seenEntities: blocksSeen } = getNextBlockForSeries(
    nextSeries,
    blocks,
    userUpdates
  );

  if (nextBlock.isEvent) {
    logEvent({eventName: formatAsEventName(nextBlock.name, TYPE_BLOCK), userId: userUpdates.id });
  }

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



function transitionIsDelayed(message, conversationStartTimestampMs, timeNowMs) {
  if (
    message.type === TYPE_MESSAGE &&
    message.messageType === MESSAGE_TYPE_TRANSITION &&
    Number.isFinite(Number(message.delayInMinutes)) &&
    Number.isFinite(conversationStartTimestampMs)
  ) {
    return (
      ((timeNowMs - conversationStartTimestampMs) / 1000 / 60) <
      Number(message.delayInMinutes)
    );
  }

  return false;
}

function createQuickReplyRetryMessage(messages) {
  const message =  messages.find(({ id }) => id === QUICK_REPLY_RETRY_ID);

  return {
    type: TYPE_MESSAGE,
    message: makePlatformMessagePayload(QUICK_REPLY_RETRY_ID, messages, message)
  };
}

function createQuickReplyRetryNextMessageResponse(action, messageOptions) {
  let messageReply = messageOptions.find(opt => action.quickReplyRetryId === opt.id);
  if (!messageReply || !messageReply.text) { return undefined; }

  const messages = [{
    id: action.quickReplyRetryId,
    text: messageReply.text,
    messageType: TYPE_QUESTION
  }];


  return {
    type: TYPE_MESSAGE,
    message: makePlatformMessagePayload(action.quickReplyRetryId, messages)
  };
}

const returnHardCodedMessageByActionType = action => {
  let messagesToSend = [];
  switch (action.type) {
    // if it was a reset user request, send the button array with responses
    case RESET_USER_RESPONSE_TYPE:
      messagesToSend.push(
        {
          type: TYPE_MESSAGE,
          message: {
            text:RESET_USER_QUESTION,
            quick_replies: RESET_USER_KEY_RESPONSE
          },
        }
      );
      break;
    case RESET_USER_CONFIRM:
      messagesToSend.push(
        {
          type: TYPE_MESSAGE,
          message: { text: RESET_USER_CONFIRM }
        }
      );
      break;
    default:
      break;
  }
  return { messagesToSend, curr: null };
};

const findMessageByActionType = (action, userUpdates, messages) => {
  let messagesToSend = [];
  let msg;
  let userHistoryMsg;
  switch (action.type) {
    case ACTION_CRISIS_REPONSE:
      msg =  messages.find(({ id }) => id === CRISIS_RESPONSE_MESSAGE_ID);
      messagesToSend.push({
        type: TYPE_MESSAGE,
        message: makePlatformMessagePayload(CRISIS_RESPONSE_MESSAGE_ID, messages)
      });

      userUpdates = R.merge(userUpdates, {
        history: updateHistory(
          R.merge(msg, {
            timestamp: Date.now()
          }),
          userUpdates.history
        )
      });
      break;
    case ACTION_RETRY_QUICK_REPLY:
      msg = createQuickReplyRetryMessage(
        messages
      );
      messagesToSend.push(msg);

      userHistoryMsg = createCustomMessageForHistory({
        id: QUICK_REPLY_RETRY_ID,
        type: TYPE_MESSAGE,
        messageType: TYPE_QUESTION_WITH_REPLIES,
        text: msg.message.text,
        isQuickReplyRetry: true,
      });

      userUpdates = R.merge(userUpdates, {
        history: updateHistory(
          R.merge(userHistoryMsg, {
            timestamp: Date.now()
          }),
          userUpdates.history
        )
      });
      break;
    case ACTION_QUICK_REPLY_RETRY_NEXT_MESSAGE:
    case TYPE_BACK_TO_CONVERSATION:
      msg = createQuickReplyRetryNextMessageResponse(
        action,
        messages
      );
      if (!msg) {
        // if there is no text in the quick reply retry message, we send the last message...
        msg = Object.assign({}, getLastSentMessageInHistory(userUpdates, true, true));
        messagesToSend.push({
          type: TYPE_MESSAGE,
          message: makePlatformMessagePayload(msg.id, messages)
        });
      } else {
        messagesToSend.push(msg);

        userHistoryMsg = createCustomMessageForHistory({
          id: action.quickReplyRetryId,
          type: TYPE_MESSAGE,
          messageType: TYPE_QUESTION,
          text: msg.message.text,
          isQuickReplyRetry: true,
        });

        userUpdates = R.merge(userUpdates, {
          history: updateHistory(
            R.merge(userHistoryMsg, {
              timestamp: Date.now()
            }),
            userUpdates.history
          )
        });
      }
      break;
    case ACTION_REPLAY_PREVIOUS_MESSAGE:
      messagesToSend.push(Object.assign({}, getLastSentMessageInHistory(userUpdates)));
      break;
    case ACTION_COME_BACK_LATER:
      msg = {
        type: TYPE_MESSAGE,
        message: { text: messages.find(({ id }) => id === END_OF_CONVERSATION_ID).text },
      };
      messagesToSend.push(msg);

      userHistoryMsg = createCustomMessageForHistory({
        id: END_OF_CONVERSATION_ID,
        type: TYPE_MESSAGE,
        messageType: MESSAGE_TYPE_TEXT,
        text: msg.message.text,
        next: {id: END_OF_CONVERSATION_ID }
      });
      userUpdates = R.merge(userUpdates, {
        history: updateHistory(
          R.merge(userHistoryMsg, {
            timestamp: Date.now()
          }),
          userUpdates.history
        )
      });
      break;
    default:
      break;
  }
  return { userUpdates, messagesToSend, curr: null };
};

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
  conversations,
  collections,
  series,
  messages,
  blocks,
  user,
  media,
  studyInfo
}) {
  let userUpdates = Object.assign({}, user);
  let messagesToSend = [];
  // skip these operations if the type of action is a 'regular' conversation/message type
  if (![TYPE_MESSAGE, TYPE_QUESTION, TYPE_COLLECTION].find(a => a === action.type)) {
    // first we check if there is a hardcoded response to make.
    // Then return early if so
    ({ messagesToSend } = returnHardCodedMessageByActionType(action));

    if (messagesToSend.length) return { messagesToSend, userUpdates };
    // then we check for special cases where a 'special' message is set in the cms
    ({ messagesToSend, userUpdates } = findMessageByActionType(action, userUpdates, messages));
    if (messagesToSend.length) return { messagesToSend, userUpdates };
  }

  // if none of the above actions occurred, then we proceed through the conversation normally
  let curr;
  if (action.type === TYPE_MESSAGE || action.type === TYPE_QUESTION) {
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
    if (curr.isEvent) logEvent({eventName: formatAsEventName(curr.name), userId: user.id });
    if ( curr.messageType === TYPE_IMAGE || curr.messageType === TYPE_VIDEO ) {
      messagesToSend.push({
        type: TYPE_MESSAGE,
        message: makePlatformMediaMessagePayload(
          curr.messageType,
          curr.url,
          media
        )
      });
    } else if (
      curr.messageType === MESSAGE_TYPE_TRANSITION &&
          transitionIsDelayed(
            curr,
            userUpdates.conversationStartTimestamp,
            moment().unix() * 1000
          )
    ) {
      // this is the same as ACTION_COME_BACK_LATER... in fact I'm not sure that this code is even being used
      const endOfConversation = messages.find(({ id }) => id === END_OF_CONVERSATION_ID);

      curr = {
        type: TYPE_MESSAGE,
        message: { text: endOfConversation.text },
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
      break;
    } else if (curr.messageType === MESSAGE_TYPE_TRANSITION) {
      ({curr, userUpdates, messagesToSend}  = getNextConversation({
        curr,
        userUpdates,
        messagesToSend,
        conversations,
        messages,
        collections,
        studyInfo,
        series,
        blocks,
      }));

      continue;
    } else {
      // this is the most common case... just send the next specified message
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
    // now break out of the curr cycle because we are going to wait for the user to reply
    if ( curr.messageType === TYPE_QUESTION || curr.messageType === TYPE_QUESTION_WITH_REPLIES) {
      break;
    }

    if (curr.next && curr.next.id !== END_OF_CONVERSATION_ID) {
      // keep going through messages if more exist and aren't waiting for user reply
      if (curr.next.type === TYPE_MESSAGE) {
        curr = Object.assign(
          {},
          getNextMessage(curr, userUpdates, messages, blocks)
        );
      // or go to the next collection
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
      // if we need to go back to the conversation as specified in the CMS, this is where that happens
      } else if (curr.next.type === TYPE_BACK_TO_CONVERSATION) {
        curr = Object.assign({}, getLastSentMessageInHistory(user, true, true));
      } else {
        curr = null;
      }
    } else {
      // decide which collection to go to next
      if (userUpdates[COLLECTION_SCOPE] && userUpdates[COLLECTION_SCOPE].length) {
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
  getNextMessageForCollection,
  getUpdateActionForUsers,
  getNextMessage,
  getMediaUrlForMessage,
  shouldReceiveUpdate,
  createCustomMessageForHistory,
};
