const {
  TYPE_ANSWER,
  TYPE_QUESTION,
  TYPE_MESSAGE,
  TYPE_CONVERSATION,
  MESSAGE_TYPE_TRANSITION,
} = require('../src/constants');

const createModifiedMocksForTransition = mocks => {
  let modifiedMocks = Object.assign(
    {},
    mocks,
    {messages: mocks.messages.slice()},
    {conversations: mocks.conversations.slice()}
  );

  const conversationId = '54321abcdefg';

  modifiedMocks.newConversationId = conversationId;

  modifiedMocks.conversations.push({
    type: TYPE_CONVERSATION,
    id: conversationId,
    isLive: true,
    name: 'test1',
  });
  const anotherId = "anotherId456";
  modifiedMocks.messages.push({
    type: TYPE_MESSAGE,
    messageType: TYPE_QUESTION,
    text: "More stuff",
    next: {id: anotherId, type: TYPE_MESSAGE},
    start: true,
    parent: {type: TYPE_CONVERSATION, id: conversationId}
  });

  const transitionId = 'transition123';
  modifiedMocks.messages.push({
    id: transitionId,
    type: TYPE_MESSAGE,
    messageType: MESSAGE_TYPE_TRANSITION,
    nextConversations: [{id: conversationId}]
  });
  const previousMessage = {
    id: 'previous123456',
    type: TYPE_MESSAGE,
    messageType: TYPE_QUESTION,
    text: "Stuff",
    next: {id: transitionId, type: TYPE_MESSAGE},
    parent: {type: TYPE_CONVERSATION, id: "intro-conversation"}
  };
  modifiedMocks.messages.push(previousMessage);

  modifiedMocks.user = {
    introConversationSeen: true,
    assignedConversationTrack: 'intro-conversation',
    history: [
      previousMessage,
      {
        type: TYPE_ANSWER,
        timestamp: Date.now(),
        message: {text: "stuff"},
        previous: previousMessage.id
      }
    ]
  };

  return modifiedMocks;
};

module.exports = {
  createModifiedMocksForTransition
};
