const {
  logEvent
} = require('./events');


const {
  getLastSentMessageInHistory,
  isUserConfirmReset,
  isUserCancelReset,
  getLastMessageSentByUser,
  isCrisisMessage,
} = require('./utils/msg_utils');

const {
  newConversationTrack,
  conversationIsLiveAndNotIntro,
} = require('./conversations');

const {
  getNextMessageForCollection
} = require('./messages');

const {
  isTypeBackToConversation,
  payloadIsBackToConvo,
  isEndOfConversation,
  shouldStartNewConversation,
  isMessageTrackDeleted,
  hasSentResponse,
  hasNotSentResponse,
  isSameDay
} = require('./utils/action');

const {
  ACTION_RETRY_QUICK_REPLY,
  ACTION_COME_BACK_LATER,
  ACTION_CRISIS_REPONSE,
  ACTION_QUICK_REPLY_RETRY_NEXT_MESSAGE,
  COLLECTION_SCOPE,
  RESET_USER_RESPONSE_TYPE,
  RESET_USER_CONFIRM,
  FB_QUICK_REPLY_RETRY_EVENT,
  QUICK_REPLY_RETRY_ID_CONTINUE,
  RESUME_MESSAGE_ID,
  TYPE_QUESTION_WITH_REPLIES,
} = require('./constants');

const R = require('ramda');

const { logger } = require('./logger');

const { isUserResetMessage } = require('./utils/msg_utils');


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
const getActionForMessage = ({
  message,
  user,
  blocks,
  series,
  messages,
  collections,
  conversations,
  studyInfo,
  params,
}) => {
  let userActionUpdates = Object.assign({}, user);
  const lastMessage = getLastSentMessageInHistory(user);
  const lastMessageSentByBot = getLastSentMessageInHistory(user, false, true);
  const resumeMessage = R.find(R.propEq('id', RESUME_MESSAGE_ID))(messages);

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
      action: { type: ACTION_QUICK_REPLY_RETRY_NEXT_MESSAGE },
      userActionUpdates
    };
  }

  // THIS IS HOW WE RETURN TO THE MAIN CONVERSATION
  let isReturnToLastMessage = false;
  const forceBackToConvo = isTypeBackToConversation(lastMessageSentByBot);
  const isResumeMessage = message && message.text
    && R.equals(message.text.toUpperCase(), resumeMessage.text.toUpperCase());
  if (forceBackToConvo || isResumeMessage || payloadIsBackToConvo(message)) {
    isReturnToLastMessage = true;
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

  // here we say this convo is done, and we'll talk to you tomorrow
  if (isEndOfConversation(lastMessage) && isSameDay(user.conversationStartTimestamp)) {
    return {
      action: { type: ACTION_COME_BACK_LATER },
      userActionUpdates
    };
  }

  // function for finding the next conversation
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

  // here we start another conversation if the user finished the old one
  // FIXME: probably never used, as currently only use one conversation (default)
  if (shouldStartNewConversation(lastMessage, user)) {
    let convoOptions = conversations.filter(conversationIsLiveAndNotIntro);
    if (R.path(['assignedConversationTrack'], user)) {
      convoOptions = conversations.filter(
        c => c.id === user.assignedConversationTrack
      );
    }
    return startNewConversationTrack(convoOptions);
  }

  // If the message track this user has been following has been deleted, start a new conversation
  if (isMessageTrackDeleted(lastMessage, messages)) {
    return startNewConversationTrack(conversations.filter(conversationIsLiveAndNotIntro));
  }

  // get next message id...
  if (hasSentResponse(message)) {
    let action = JSON.parse(message.quick_reply.payload);
    if (action && action.id) {
      return {
        action,
        userActionUpdates
      };
    }
  }
  // if the user did not respond correctly to the question
  // try the message with the quick-reply buttons saying 'Hey, I don't get that'
  const getNext = m => m && m.messageType !== TYPE_QUESTION_WITH_REPLIES && R.pathOr(null, ['next'], m);

  const next = getNext(lastMessageSentByBot) || getNext(lastMessage);

  if (hasNotSentResponse(lastMessageSentByBot, message) && !(next)) {
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
  if (next) {
    action = { type: next.type, id: next.id };
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
};

module.exports = { getActionForMessage };
