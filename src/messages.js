const {
  updateHistory,
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
  hasBegunIntro
} = require('./utils/user_utils');

const {
  getLastSentMessageInHistory,
  isUserConfirmReset,
  isUserCancelReset,
  getLastMessageSentByUser,
  formatAsEventName,
  isCrisisMessage,
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
  END_OF_CONVERSATION_MESSAGE,
  CRISIS_RESPONSE_MESSAGE_ID,
  LOGIC_SEQUENTIAL,
  LOGIC_RANDOM,
  COLLECTION_PROGRESS,
  SERIES_PROGRESS,
  SERIES_SEEN,
  BLOCKS_SEEN,
  COLLECTION_SCOPE,
  CUT_OFF_HOUR_FOR_NEW_MESSAGES,
  NUMBER_OF_UPDATE_MESSAGES_ALLOWED,
  MINUTES_OF_INACTIVITY_BEFORE_UPDATE_MESSAGE,
  STUDY_ID_NO_OP,
  STUDY_MESSAGES,
  RESET_USER_RESPONSE_TYPE,
  RESET_USER_KEY_RESPONSE,
  RESET_USER_QUESTION,
  RESET_USER_CONFIRM,
  FB_EVENT_COMPLETE_INTRO_CONVERSATION,
  FB_QUICK_REPLY_RETRY_EVENT,
  QUICK_REPLY_RETRY_ID_CONTINUE,
  TYPE_BACK_TO_CONVERSATION,
  RESUME_MESSAGE_ID
} = require('./constants');

const R = require('ramda');

const { logger } = require('./logger');

const moment = require('moment');

const { isUserResetMessage } = require('./utils/msg_utils');

/**
 * Create Specific Platform Payload
 *
 * @param {String} action
 * @param {Array} messages
 * @return {Object}
*/
function makePlatformMessagePayload(action, messages) {
  const message = messages.find(m =>  m.id === action);

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

function userIsStartingStudy(oldUser, newUser) {
  return !Number.isFinite(Number(R.path(['studyId'],oldUser))) &&
         Number.isFinite(Number(R.path(['studyId'], newUser)));
}

function studyIdIsNotificationEligable(user) {
  return Number.isFinite(Number(R.path(['studyId'], user))) &&
        Number(R.path(['studyId'], user)) !== STUDY_ID_NO_OP;
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


//TODO: could rewrite this and getLastSentMessageInHistory as they both look through user
// history for something... could reduce code here.
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

function doesMessageStillExist(message, messages) {
  return !!(messages.find(m => message.id === m.id));
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
  conversations,
  studyInfo,
  params,
}) {
  let userActionUpdates = Object.assign({}, user);
  const lastMessage = getLastSentMessageInHistory(user);
  if (isCrisisMessage(message, params.crisisTerms, params.crisisWords)) {
    return {
      action: { type: ACTION_CRISIS_REPONSE },
      userActionUpdates
    };
  }

  // here we check if the message sent was a request to reset the user data (admin only)
  if (isUserResetMessage(message)) {
    return {
      action: { type: RESET_USER_RESPONSE_TYPE },
      userActionUpdates
    };
  }

  // this is just to reduce clutter later on
  const startNewConversationTrack = convo => {
    const newTrack = newConversationTrack(
      convo,
      messages,
      collections,
      studyInfo,
      user
    );

    let action = newTrack.action;

    userActionUpdates = Object.assign({}, userActionUpdates, newTrack.user);

    return {
      action,
      userActionUpdates
    };
  };

  // here we check if the message sent was a confirmation to reset user data (admin only)
  if (isUserConfirmReset(message)) {
    return {
      action: { type: RESET_USER_CONFIRM },
      userActionUpdates
    };
  }

  // here we check if the message sent was canceling a request to reset user data (admin only)

  if (isUserCancelReset(getLastMessageSentByUser(user))) {
    return {
      action: { type: ACTION_REPLAY_PREVIOUS_MESSAGE },
      userActionUpdates
    };
  }

  // here we start another conversation if the user finished the old one
  if (
    R.path(['next', 'id'], lastMessage) === END_OF_CONVERSATION_ID &&
      R.path(['messageType'], lastMessage) !== TYPE_QUESTION_WITH_REPLIES &&
      atEndOfConversationAndShouldRestart(user, moment().unix(), CUT_OFF_HOUR_FOR_NEW_MESSAGES)
  ) {
    let convoOptions = conversations.filter(conversationIsLiveAndNotIntro);
    if (R.path(['assignedConversationTrack'], user)) {
      convoOptions = conversations.filter(
        c => c.id === user.assignedConversationTrack
      );
    }
    return startNewConversationTrack(convoOptions);
  }

  // here we say this convo is done, and we'll talk to you tomorrow
  if (
    R.path(['next', 'id'], lastMessage) === END_OF_CONVERSATION_ID &&
      R.path(['messageType'], lastMessage) !== TYPE_QUESTION_WITH_REPLIES
  ) {
    return {
      action: { type: ACTION_COME_BACK_LATER },
      userActionUpdates
    };
  }

  // THIS IS HOW WE RETURN TO THE MAIN CONVERSATION
  const lastMessageSentByBot = getLastSentMessageInHistory(user, false);
  let isReturnToLastMessage = false;
  const forceBackToConvo = lastMessageSentByBot && lastMessageSentByBot.next &&
    R.equals(lastMessageSentByBot.next.type, TYPE_BACK_TO_CONVERSATION);
  const resumeMessage = R.find(R.propEq('id', RESUME_MESSAGE_ID))(messages);
  const isResumeMessage = message && message.text &&
    R.equals(message.text.toUpperCase(), resumeMessage.text.toUpperCase());
  if (forceBackToConvo || isResumeMessage) {
    isReturnToLastMessage = true;
  }
  if (message && message.quick_reply && message.quick_reply.payload) {
    const payload = JSON.parse(message.quick_reply ? message.quick_reply.payload : "{}");
    if (R.equals(payload.id, QUICK_REPLY_RETRY_ID_CONTINUE) ||
    R.equals(payload.type, TYPE_BACK_TO_CONVERSATION)) {
      isReturnToLastMessage = true;
    }
  }

  if (isReturnToLastMessage) {
    return {
      action: {
        type: ACTION_QUICK_REPLY_RETRY_NEXT_MESSAGE,
        quickReplyRetryId: QUICK_REPLY_RETRY_ID_CONTINUE
      },
      userActionUpdates
    };
  }

  // If the message track this user has been following has been deleted, start a new conversation
  if (
    R.path(['next', 'id'], lastMessage) &&
      lastMessage.messageType !== TYPE_QUESTION_WITH_REPLIES &&
      (!doesMessageStillExist(lastMessage, messages) ||
       !doesMessageStillExist(lastMessage.next, messages))
  ) {
    return startNewConversationTrack(conversations.filter(conversationIsLiveAndNotIntro));
  }

  // end conversation if appropriate...
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

    if (action.id) {
      return {
        action,
        userActionUpdates
      };
    }
  }

  // if the user did not respond correctly to the question
  // try the message with the quick-reply buttons saying 'Hey, I don't get that'
  if (
    R.path(['messageType'], lastMessage) === TYPE_QUESTION_WITH_REPLIES &&
      !message.quick_reply
  ) {
    logEvent({userId: user.id, eventName: FB_QUICK_REPLY_RETRY_EVENT}).catch(err => {
      logger.log(err);
      logger.log('error', `something went wrong logging event ${FB_QUICK_REPLY_RETRY_EVENT} ${user.id}`);
    });
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
    // if the user is working through a collection, then we move through that
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
    // just start a new conversation
  } else {
    return startNewConversationTrack(conversations.filter(conversationIsLiveAndNotIntro));
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

function createQuickReplyRetryMessage(id, messages) {
  const message = [R.find(R.propEq('id', id))(messages)];
  return {
    type: TYPE_MESSAGE,
    message: makePlatformMessagePayload(id, message)
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

  let messagesToSend = [];
  let curr;
  let userUpdates = Object.assign({}, user);
  // if it was a reset user request, send the button array with responses
  if (action.type === RESET_USER_RESPONSE_TYPE) {
    curr = {
      type: TYPE_MESSAGE,
      message: {
        text:RESET_USER_QUESTION,
        quick_replies: RESET_USER_KEY_RESPONSE
      },
    };

    messagesToSend.push(curr);
    curr = null;
  // if it was a reset user confirm, send the confrimation text
  } else if (action.type === RESET_USER_CONFIRM) {
    curr = {
      type: TYPE_MESSAGE,
      message: { text: RESET_USER_CONFIRM }
    };

    messagesToSend.push(curr);
    curr = null;

  } else if (action.type === ACTION_CRISIS_REPONSE) {
    const crisisMessage = R.find(R.propEq('id', CRISIS_RESPONSE_MESSAGE_ID))(messages);
    curr = {
      message: R.omit(['name','id', 'messageType', 'parent', 'type', 'next'], crisisMessage),
      type: TYPE_MESSAGE
    };

    messagesToSend.push(curr);

    curr = createCustomMessageForHistory({
      messageType: MESSAGE_TYPE_TEXT,
      ...crisisMessage,
    });

    curr.isCrisisMessage = true;

    userUpdates = R.merge(userUpdates, {
      history: updateHistory(
        R.merge(crisisMessage, {
          timestamp: Date.now()
        }),
        userUpdates.history
      )
    });
    curr = null;
  } else if (action.type === ACTION_RETRY_QUICK_REPLY) {
    curr = createQuickReplyRetryMessage(
      QUICK_REPLY_RETRY_ID,
      messages
    );
    messagesToSend.push(curr);

    curr = createCustomMessageForHistory({
      id: QUICK_REPLY_RETRY_ID,
      type: TYPE_MESSAGE,
      messageType: TYPE_QUESTION_WITH_REPLIES,
      text: curr.message.text,
    });

    curr.isQuickReplyRetry = true;

    userUpdates = R.merge(userUpdates, {
      history: updateHistory(
        R.merge(curr, {
          timestamp: Date.now()
        }),
        userUpdates.history
      )
    });
    curr = null;
  } else if (action.type === ACTION_QUICK_REPLY_RETRY_NEXT_MESSAGE|| action.type === TYPE_BACK_TO_CONVERSATION) {
    let message = createQuickReplyRetryNextMessageResponse(
      action,
      messages
    );
    if (!message) {
      // if there is no text in the quick reply retry message, we send the last message...
      curr = Object.assign({}, getLastSentMessageInHistory(user, true, true));
    } else {
      curr = message;

      messagesToSend.push(curr);

      curr = createCustomMessageForHistory({
        id: action.quickReplyRetryId,
        type: TYPE_MESSAGE,
        messageType: TYPE_QUESTION,
        text: curr.message.text,
      });
      curr.isQuickReplyRetry = true;

      userUpdates = R.merge(userUpdates, {
        history: updateHistory(
          R.merge(curr, {
            timestamp: Date.now()
          }),
          userUpdates.history
        )
      });
      curr = null;
    }
  } else if (action.type === ACTION_REPLAY_PREVIOUS_MESSAGE) {
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
  } else if (action.type === TYPE_MESSAGE || action.type === TYPE_QUESTION) {
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
    if (
      curr.messageType === TYPE_IMAGE ||
            curr.messageType === TYPE_VIDEO
    ) {
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
      if (messagesToSend.length === 0) {
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
      }
      break;
    } else if (
      curr.messageType === MESSAGE_TYPE_TRANSITION
    ) {
      let conversationsForNewTrack = [];
      if (R.path(['nextConversations', 'length'], curr) > 0) {
        conversationsForNewTrack = curr.nextConversations.map(nC =>
          conversations.find(c => c.id === nC.id)
        ).filter(nc => !!nc);
      }
      // here we mark this user as having completed the intro conversation,
      // so we can send push messages to them
      if (hasBegunIntro(user) && !hasFinishedIntro(user)) {
        logEvent({ userId: user.id, eventName: FB_EVENT_COMPLETE_INTRO_CONVERSATION });
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

      continue;
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
      } else if (curr.next.type === TYPE_BACK_TO_CONVERSATION) {
        curr = Object.assign({}, getLastSentMessageInHistory(user, true, true));
      } else {
        curr = null;
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
  getMediaUrlForMessage,
  shouldReceiveUpdate,
  createCustomMessageForHistory,
};
