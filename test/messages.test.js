const expect = require('chai').expect;
const testModule = require('../src/messages');
const { generateUniqueStudyId, isCrisisMessage } = require('../src/utils/msg_utils');

testModule.generateUniqueStudyId = generateUniqueStudyId;
const {
  TYPE_BLOCK,
  TYPE_SERIES,
  TYPE_COLLECTION,
  TYPE_ANSWER,
  TYPE_QUESTION,
  TYPE_QUESTION_WITH_REPLIES,
  TYPE_MESSAGE,
  TYPE_CONVERSATION,
  MESSAGE_TYPE_TRANSITION,
  INTRO_CONVERSATION_ID,
  LOGIC_SEQUENTIAL,
  STUDY_ID_LIST,
  STUDY_ID_NO_OP,
  RESET_USER_RESPONSE_TYPE
} = require('../src/constants');

const mocks = require('./mock');

const moment = require('moment');

const media = require('../stubs/media.json');

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

const createModifiedMocksForConversationStartingWithCollection = mocks => {
  let modifiedMocks = Object.assign(
    {},
    mocks,
    {collections: mocks.collections.slice()},
    {messages: mocks.messages.slice()},
    {conversations: mocks.conversations.slice()},
    {series: mocks.series.slice()},
    {blocks: mocks.blocks.slice()}
  );

  const conversationId = '54321abcdefg';

  modifiedMocks.newConversationId = conversationId;

  modifiedMocks.conversations.push({
    type: TYPE_CONVERSATION,
    id: conversationId,
    isLive: true,
    name: 'test1',
  });

  // new Collection
  const collectionId = "SJoihxbLM";
  modifiedMocks.collections.push({
    id: collectionId,
    name: "Collection Test",
    next: {id: "HyLwQaxIG", type: "message"},
    parent: {type: TYPE_CONVERSATION, id: conversationId},
    rule: LOGIC_SEQUENTIAL,
    start: true,
    type: TYPE_COLLECTION
  });

  // new series
  const seriesId = "H1U33g-8G";
  modifiedMocks.series.push({
    id: seriesId,
    name: "Series ABC",
    parent: {type: TYPE_COLLECTION, id: collectionId},
    rule: LOGIC_SEQUENTIAL
  });

  //new block
  const blockId = "H1th3gWIG";
  modifiedMocks.blocks.push({
    id: blockId,
    name: "BLOCK-A",
    parent: {type: TYPE_SERIES, id: seriesId},
    type: TYPE_BLOCK
  });

  const messageId = "r1mgalZIM";
  modifiedMocks.messages.push({
    id: messageId,
    messageType: TYPE_QUESTION,
    name: "Message 46",
    next: {id: "H1G7ukCwf", type: TYPE_MESSAGE},
    parent: {type: TYPE_BLOCK, id: blockId},
    start: true,
    text: "hello?",
    type: TYPE_MESSAGE
  });

  const transitionId = 'transition123';
  modifiedMocks.messages.push({
    id: transitionId,
    type: TYPE_MESSAGE,
    messageType: MESSAGE_TYPE_TRANSITION,
    nextConversations: [{id: conversationId, text: "sigma"}]
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

describe('Messages Module', () => {
  it('should have an getActionForMessage function', () => {
    expect(typeof testModule.getActionForMessage).to.equal('function');
  });

  describe('generateUniqueStudyId', () => {
    it('should generate (almost) all unique studyIds', () => {
      let studyIds = [];
      let studyId;

      for(let i = 0; i < STUDY_ID_LIST.length; i++) {
        ({ studyId } = testModule.generateUniqueStudyId(studyIds, STUDY_ID_LIST));
        expect(studyId.length).to.eq(5);
        expect(studyIds.length).to.eq(i + 1);
        expect(Number.isFinite(Number(studyId))).to.be.true;
      }

      ({ studyId } = testModule.generateUniqueStudyId(studyIds, STUDY_ID_LIST));
      expect(studyId).to.eq(String(STUDY_ID_NO_OP));
    });

    it('should continue to return the no op value if all of the study ids are used', () => {
      let studyId;
      for (let i = 0; i < 10; i++) {
        ({ studyId } = testModule.generateUniqueStudyId(STUDY_ID_LIST.map(String), STUDY_ID_LIST));
        expect(studyId).to.eq(String(STUDY_ID_NO_OP));
      }
    });

  });

  describe('shouldReceiveUpdate', () => {
    it('should not update if the user is not defined', () => {
      expect(testModule.shouldReceiveUpdate()).to.be.false;
    });

    it('should update if the user\'s last answer was more than 24 hours ago', () => {
      const user = {
        introConversationSeen: true,
        history: [
          {
            type: TYPE_ANSWER,
            timestamp: moment().subtract(2, 'day').unix() * 1000,
            message: {text: "hi"},
            previous: undefined
          }
        ]
      };

      expect(testModule.shouldReceiveUpdate(user, Date.now())).to.be.true;
    });

    it('should not update if the user is marked as invalid', () => {
      const user = {
        introConversationSeen: true,
        history: [
          {
            type: TYPE_ANSWER,
            timestamp: moment().subtract(2, 'day').unix() * 1000,
            message: {text: "hi"},
            previous: undefined
          }
        ],
        invalidUser: true
      };

      expect(testModule.shouldReceiveUpdate(user, Date.now())).to.be.false;
    });

    it('should not update if the user\'s last answer was recent', () => {
      const user = {
        introConversationSeen: true,
        history: [
          {
            type: TYPE_ANSWER,
            timestamp: moment().subtract(120, 'minute').unix() * 1000,
            message: {text: "hi"},
            previous: undefined
          }
        ]
      };

      expect(testModule.shouldReceiveUpdate(user, Date.now())).to.be.false;
    });

    it('should not update if recently updated', () => {
      const user = {
        introConversationSeen: true,
        history: [
          {
            type: TYPE_ANSWER,
            timestamp: moment().subtract(1, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "hi"},
            previous: undefined
          },
          {
            timestamp: moment().subtract(10, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          }
        ]
      };

      expect(testModule.shouldReceiveUpdate(user, Date.now())).to.be.false;
    });

    it('should update if updated more than 24 hours ago', () => {
      const user = {
        introConversationSeen: true,
        history: [
          {
            type: TYPE_ANSWER,
            timestamp: moment().subtract(2, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "hi"},
            previous: undefined
          },
          {
            timestamp: moment().subtract(1, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          }
        ]
      };

      expect(testModule.shouldReceiveUpdate(user, Date.now())).to.be.true;
    });

    it('should update after 3 tries', () => {
      const user = {
        introConversationSeen: true,
        history: [
          {
            type: TYPE_ANSWER,
            timestamp: moment().subtract(4, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "hi"},
            previous: undefined
          },
          {
            timestamp: moment().subtract(3, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          },
          {
            timestamp: moment().subtract(2, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          },
          {
            timestamp: moment().subtract(1, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          },
        ]
      };

      expect(testModule.shouldReceiveUpdate(user, Date.now())).to.be.true;
    });

    it('should not update after 3 tries, if recently updated', () => {
      const user = {
        introConversationSeen: true,
        history: [
          {
            type: TYPE_ANSWER,
            timestamp: moment().subtract(4, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "hi"},
            previous: undefined
          },
          {
            timestamp: moment().subtract(3, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          },
          {
            timestamp: moment().subtract(2, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          },
          {
            timestamp: moment().subtract(120, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          },
        ]
      };

      expect(testModule.shouldReceiveUpdate(user, Date.now())).to.be.false;
    });

    it('should not update after 7 tries', () => {
      const user = {
        introConversationSeen: true,
        history: [
          {
            type: TYPE_ANSWER,
            timestamp: moment().subtract(8, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "hi"},
            previous: undefined
          },
          {
            timestamp: moment().subtract(7, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          },
          {
            timestamp: moment().subtract(6, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          },
          {
            timestamp: moment().subtract(5, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          },
          {
            timestamp: moment().subtract(4, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          },
          {
            timestamp: moment().subtract(3, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          },
          {
            timestamp: moment().subtract(2, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          },
          {
            timestamp: moment().subtract(1, 'day').subtract(20, 'minute').unix() * 1000,
            message: {text: "How are you"},
            isUpdate: true
          }
        ]
      };

      expect(testModule.shouldReceiveUpdate(user, Date.now())).to.be.false;
    });
  });

  const CRISIS_KEYWORDS = [
    'suicide',
    'kill',
    'hurt myself',
    'don\'t want to live',
    'bridge',
    'what is the point',
    'whats the point',
    'harm',
    'hurt',
    'hurting',
    'gun',
  ];

  describe('isCrisisMessage', () => {
    it('should identify text that needs a crisis message', () => {
      const message = {text: "Going to KiLl myself"};

      expect(isCrisisMessage(message, CRISIS_KEYWORDS)).to.be.true;
    });

    it('should not identify false positives', () => {
      const message = {text: "Going to sKiLl myself"};

      expect(isCrisisMessage(message, CRISIS_KEYWORDS)).to.be.false;

      const declaration = {
        text: "When, in the course of human events, it becomes necessary for one people to dissolve the political bands which have connected them with another, and to assume among the powers of the earth, the separate and equal station to which the laws of nature and of nature's God entitle them, a decent respect to the opinions of mankind requires that they should declare the causes which impel them to the separation. We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable rights, that among these are life, liberty and the pursuit of happiness. That to secure these rights, governments are instituted among men, deriving their just powers from the consent of the governed. That whenever any form of government becomes destructive to these ends, it is the right of the people to alter or to abolish it, and to institute new government, laying its foundation on such principles and organizing its powers in such form, as to them shall seem most likely to effect their safety and happiness. Prudence, indeed, will dictate that governments long established should not be changed for light and transient causes; and accordingly all experience hath shown that mankind are more disposed to suffer, while evils are sufferable, than to right themselves by abolishing the forms to which they are accustomed. But when a long train of abuses and usurpations, pursuing invariably the same object evinces a design to reduce them under absolute despotism, it is their right, it is their duty, to throw off such government, and to provide new guards for their future security. --Such has been the patient sufferance of these colonies; and such is now the necessity which constrains them to alter their former systems of government. The history of the present King of Great Britain is a history of repeated injuries and usurpations, all having in direct object the establishment of an absolute tyranny over these states. To prove this, let facts be submitted to a candid world." //eslint-disable-line max-len
      };

      expect(isCrisisMessage(declaration, CRISIS_KEYWORDS)).to.be.false;
    });

    it("should ignore punctuation", () => {
      const message = {text: "hurt.,#?!$%^&*;:{}=-_`~() myself"};

      expect(isCrisisMessage(message, CRISIS_KEYWORDS)).to.be.true;
    });
  });

  describe('makePlatformMessagePayload', () => {
    const messages = [
      {
        id: 1,
        text: 'message text',
        messageType: TYPE_MESSAGE
      },
      {
        id: 2,
        text: 'quick reply text',
        quick_replies: [
          {title: "stuff", payload: "{\"id\":\"1234\",\"type\":\"message\"}"},
          {title: "other stuff", payload: "{\"id\":\"1234\",\"type\":\"message\"}"}
        ],
        messageType: TYPE_QUESTION_WITH_REPLIES,
      },
      {
        id: 3,
        text: 'quick reply text',
        quick_replies: [{}],
        messageType: TYPE_QUESTION_WITH_REPLIES,
      }
    ];

    it('creates a platform specific text message payload for facebook', () => {
      const message = testModule.makePlatformMessagePayload(1, messages);
      expect(message.text).to.equal(messages[0].text);
    });

    it('creates a platform specific quick reply message payload for facebook', () => {
      const message = testModule.makePlatformMessagePayload(2, messages);

      expect(message.text).to.equal(messages[1].text);
      const qrSolutions = messages[1].quick_replies;
      expect(message.quick_replies.length).to.equal(2);
      expect(message.quick_replies).to.deep.equal(qrSolutions);
    });

    it('creats a quick reply message even if the payload is undefined', () => {
      const message = testModule.makePlatformMessagePayload(3, messages);

      expect(message.text).to.equal(messages[2].text);
      expect(message.quick_replies.length).to.equal(1);
      expect(message.quick_replies[0].title).to.be.undefined;
      expect(message.quick_replies[0].payload).to.equal("{}");
    });
  });

  describe('getActionForMessage', () => {
    describe('empty user history', () => {
      it('gets intro seen state set in user update', () => {
        const data = Object.assign({}, {user: { history: [] }}, mocks);
        const {userActionUpdates} = testModule.getActionForMessage(data);
        expect(userActionUpdates).to.not.be.undefined;
        expect(userActionUpdates).to.have.all.keys('history', 'introConversationSeen');
        expect(userActionUpdates.introConversationSeen).to.be.true;
      });

      it('starts with the first intro message', () => {
        const data = Object.assign({}, {user: { history: [] }}, mocks);
        const {action} = testModule.getActionForMessage(data);
        expect(action).to.not.be.undefined;
        expect(action).to.have.all.keys('id', 'type');
        expect(action.type).to.eq(TYPE_MESSAGE);
        const firstIntroMessage = mocks.messages.find(m => (
          m.start && m.parent && m.parent.id === INTRO_CONVERSATION_ID
        ));
        expect(action.id).to.eq(firstIntroMessage.id);
      });
    });

    it('starts in the assigned conversation track', () => {
      let user = { user: {
        introConversationSeen: true,
        assignedConversationTrack: 'r1IJzNy-G',
        history: [
          {
            type: TYPE_ANSWER,
            timestamp: Date.now(),
            message: {text: "hi"},
            previous: undefined
          }
        ]
      }};

      const data = Object.assign({}, user, mocks);
      const {action, userActionUpdates} = testModule.getActionForMessage(data);

      expect(action.id).to.equal('ryBK6QM-G');
      expect(action.type).to.equal(TYPE_MESSAGE);

      expect(userActionUpdates).to.exist;
      expect(userActionUpdates.history.length).to.equal(1);
    });

    it('will return the reset user type action if to the user if the correct string is given ', () => {
      let user = { user: {
        introConversationSeen: true,
        assignedConversationTrack: 'r1IJzNy-G',
        history: [
          {
            type: TYPE_ANSWER,
            timestamp: Date.now(),
            message: {text: "hi"},
            previous: undefined
          }
        ]
      }};

      const data = Object.assign({}, user, mocks, {message: { text: '#oz8mu[M7h9C6rsrNza9' }});
      const {action, userActionUpdates} = testModule.getActionForMessage(data);

      expect(action.type).to.equal(RESET_USER_RESPONSE_TYPE);

      expect(userActionUpdates).to.exist;
      expect(userActionUpdates.history.length).to.equal(1);
    });

    it('gets the appropriate action for a transition', () => {
      let modifiedMocks = createModifiedMocksForTransition(mocks);
      const {action} = testModule.getActionForMessage(modifiedMocks);

      expect(action).to.exist;
      let transitionMessage = modifiedMocks.messages.find(
        m => m.messageType === MESSAGE_TYPE_TRANSITION
      );
      expect(action.id).to.equal(transitionMessage.id);
      expect(action.type).to.equal(TYPE_MESSAGE);
    });

    it('can transition back to the intro', () => {
      const modifiedMocks = createModifiedMocksForTransition(mocks);
      const newMessages = modifiedMocks.messages.map(m => (
        m.messageType === MESSAGE_TYPE_TRANSITION ?
          Object.assign(
            {},
            m,
            {nextConversations: [{id: 'intro-conversation', text: 'yolo'}]}
          ) : m
      ));


      const transitionMessage =
          newMessages.find(m => m.messageType === MESSAGE_TYPE_TRANSITION);
      expect(modifiedMocks.user.introConversationSeen).to.be.true;
      const newMocks = Object.assign({}, modifiedMocks, {messages: newMessages});
      const {action, userActionUpdates} = testModule.getActionForMessage(newMocks);

      expect(action).to.exist;
      expect(action.id).to.equal(transitionMessage.id);
      expect(userActionUpdates).to.exist;
      expect(userActionUpdates.introConversationSeen).to.be.true;
    });
  });

  describe('getNextMessage', () => {
    const user = {
      history: [
        { block: 'block-1', next: { type: TYPE_BLOCK, after: '2' } }
      ],
      blockScope: ['block-1']
    };

    const messages = [
      { id: '1', text: 'message 1' },
      { id: '2', text: 'message 2' },
      { id: '3', text: 'message 3' }
    ];

    it('follows the block path if next message is pointing to a block', () => {
      const message = testModule.getNextMessage(
        { next: { id: 'block-2', type: TYPE_BLOCK } },
        Object.assign({}, user, { blockScope: [] }),
        messages,
        [{ id: 'block-2', startMessage: '1' }]
      );

      expect(message).to.equal(messages[0]);
    });

    it('returns the next message id', () => {
      const nextMessage = '3';

      const message = testModule.getNextMessage(
        { next: { id: nextMessage } },
        Object.assign({}, user, { blockScope: [{}] }),
        messages,
        []
      );

      expect(message).to.equal(messages[2]);
    });
  });

  describe('getMessagesForAction', () => {
    it('returns the next set of messages', () => {
      let action = {action: {id: "ryEn5QyZf", type: TYPE_MESSAGE}};
      let user = { user: {
        introConversationSeen: true,
        history: [
          {
            type: TYPE_ANSWER,
            timestamp: Date.now(),
            message: {text: "hi"},
            previous: undefined
          }
        ]
      }};

      let data = Object.assign({}, action, mocks, user);
      let nextMessages = testModule.getMessagesForAction(data);
      expect(nextMessages.messagesToSend.length).to.equal(3);
      expect(nextMessages.messagesToSend[2].message.quick_replies.length).to.equal(2);

      expect(nextMessages.userUpdates.history.length).to.equal(4);
      expect(nextMessages.userUpdates.history[0].type).to.equal(TYPE_ANSWER);
      expect(nextMessages.userUpdates.history[0].message.text).to.equal('hi');
      expect(nextMessages.userUpdates.history[3].messageType).to.equal(TYPE_QUESTION_WITH_REPLIES);
    });

    it('gets the message within a conversation track', () => {
      let action = {action: {id: 'ryBK6QM-G', type: TYPE_MESSAGE}};
      let user = { user: {
        introConversationSeen: true,
        assignedConversationTrack: 'r1IJzNy-G',
        history: [
          {
            type: TYPE_ANSWER,
            timestamp: Date.now(),
            message: {text: "hi"},
            previous: undefined
          }
        ]
      }};

      let data = Object.assign({}, action, mocks, user);
      let nextMessages = testModule.getMessagesForAction(data);

      expect(nextMessages.messagesToSend.length).to.equal(1);
      expect(nextMessages.messagesToSend[0].message.quick_replies.length).to.equal(2);
      expect(nextMessages.messagesToSend[0].message.text).to.equal("Hey, you free to talk?");

      expect(nextMessages.userUpdates.history.length).to.equal(2);
      expect(nextMessages.userUpdates.history[0].type).to.equal(TYPE_ANSWER);
      expect(nextMessages.userUpdates.history[0].message.text).to.equal('hi');
      expect(nextMessages.userUpdates.history[1].messageType).to.equal(TYPE_QUESTION_WITH_REPLIES);
      expect(nextMessages.userUpdates.history[1].id).to.equal('ryBK6QM-G');
    });

    it('handles transitions correctly', () => {
      let modifiedMocks = createModifiedMocksForTransition(mocks);
      let transitionMessage = modifiedMocks.messages.find(
        m => m.messageType === MESSAGE_TYPE_TRANSITION
      );
      let action = {action: {id: transitionMessage.id, type: TYPE_MESSAGE}};
      const data = Object.assign({}, modifiedMocks, action);
      const {messagesToSend} = testModule.getMessagesForAction(data);

      expect(messagesToSend).to.exist;
      expect(Array.isArray(messagesToSend)).to.be.true;
      expect(messagesToSend.length).to.equal(1);
      expect(messagesToSend[0].message.text).to.equal("More stuff");
    });

    it('handles transitions with text', () => {
      let modifiedMocks = createModifiedMocksForTransition(mocks);
      const text = "message from transition";
      const firstMessageInConversation = "More stuff";

      const messagesWithTransitionText = modifiedMocks.messages.map(m => (
        m.messageType === MESSAGE_TYPE_TRANSITION ?
          Object.assign(
            {},
            m,
            {nextConversations: [{id: modifiedMocks.newConversationId, text}]}
          ) : m
      ));
      const mocksWithTransitionText = Object.assign(
        {},
        modifiedMocks,
        {messages: messagesWithTransitionText}
      );

      let transitionMessage = mocksWithTransitionText.messages.find(
        m => m.messageType === MESSAGE_TYPE_TRANSITION
      );
      let action = {action: {id: transitionMessage.id, type: TYPE_MESSAGE}};
      const data = Object.assign({}, mocksWithTransitionText, action);
      const {messagesToSend, userUpdates} = testModule.getMessagesForAction(data);

      expect(messagesToSend).to.exist;
      expect(Array.isArray(messagesToSend)).to.be.true;
      expect(messagesToSend.length).to.equal(2);
      expect(messagesToSend[0].message.text).to.equal(text);
      expect(messagesToSend[1].message.text).to.equal(firstMessageInConversation);

      expect(userUpdates).to.exist;
      expect(userUpdates.history).to.exist;
      expect(userUpdates.history.length).to.equal(4);
      expect(userUpdates.history[3].text).to.equal(firstMessageInConversation);

      const currentConversation =
            modifiedMocks.conversations[modifiedMocks.conversations.length - 1];
      expect(userUpdates.assignedConversationTrack).to.equal(currentConversation.id);
    });

    it('can transition back to the intro', () => {
      const modifiedMocks = createModifiedMocksForTransition(mocks);
      const newMessages = modifiedMocks.messages.map(m => (
        m.messageType === MESSAGE_TYPE_TRANSITION ?
          Object.assign(
            {},
            m,
            {nextConversations: [{id: 'intro-conversation', text: 'yolo'}]}
          ) : m
      ));


      const transitionMessage =
            newMessages.find(m => m.messageType === MESSAGE_TYPE_TRANSITION);
      expect(modifiedMocks.user.introConversationSeen).to.be.true;
      const newMocks = Object.assign(
        {},
        modifiedMocks,
        {messages: newMessages},
        {action: {id: transitionMessage.id, type: TYPE_MESSAGE}}
      );

      const {messagesToSend, userUpdates} =
            testModule.getMessagesForAction(newMocks);

      expect(messagesToSend).to.exist;
      expect(userUpdates).to.exist;
      expect(Array.isArray(messagesToSend)).to.be.true;
      expect(messagesToSend.length).to.equal(4);
      const firstMessageOfIntro = newMessages.find(m => (
        m.parent && m.parent.id === 'intro-conversation' && m.start
      ));

      expect(messagesToSend[1].message.text).to.equal(firstMessageOfIntro.text);
      expect(messagesToSend[0].message.text).to.equal("yolo");

    });

    it('can transition to a conversation that starts with a collection', () => {
      const modifiedMocks =
            createModifiedMocksForConversationStartingWithCollection(mocks);

      const transitionMessage = modifiedMocks.messages.find(
        m => m.messageType === MESSAGE_TYPE_TRANSITION
      );
      expect(modifiedMocks.user.introConversationSeen).to.be.true;
      expect(transitionMessage).to.exist;

      const data = Object.assign(
        {},
        modifiedMocks,
        {action: {id: transitionMessage.id, type: TYPE_MESSAGE}}
      );

      const {messagesToSend, userUpdates} =
            testModule.getMessagesForAction(data);

      expect(Array.isArray(messagesToSend)).to.be.true;
      expect(messagesToSend.length).to.eq(2);
      expect(messagesToSend[0].message.text).to.eq("sigma");
      expect(messagesToSend[1].message.text).to.eq("hello?");

      expect(userUpdates).to.exist;
      expect(userUpdates.history.length > 2).to.be.true;
      expect(userUpdates.history[userUpdates.history.length - 1 ].text).to.eq("hello?");
    });

    it('will set the introConversationFinished value to true at the correct time', () => {
      const modifiedMocks =
            createModifiedMocksForConversationStartingWithCollection(mocks);

      const transitionMessage = modifiedMocks.messages.find(
        m => m.messageType === MESSAGE_TYPE_TRANSITION
      );
      expect(modifiedMocks.user.introConversationSeen).to.be.true;
      expect(transitionMessage).to.exist;

      const data = Object.assign(
        {},
        modifiedMocks,
        {action: {id: transitionMessage.id, type: TYPE_MESSAGE}}
      );
      const {userUpdates} = testModule.getMessagesForAction(data);
      expect(userUpdates.introConversationFinished).to.be.true;
    });
  });

  describe('getMediaUrlForMessage', () => {
    it('returns a url for the media type', () => {
      let url = testModule.getMediaUrlForMessage('image', {}, media);
      let mediaElement = media['image'].find(m => m.url === url);

      expect(mediaElement.url).to.equal(url);

      url = testModule.getMediaUrlForMessage('video', {}, media);
      mediaElement = media['video'].find(m => m.url === url);

      expect(mediaElement.url).to.equal(url);
    });
  });

  describe('makePlatformMediaMessagePayload', () => {
    it('creates a payload for an image', () => {
      const url = 'https://www.test.com/img.png';
      const payload = testModule.makePlatformMediaMessagePayload('image', url);
      expect(payload).to.exist;
      expect(payload.attachment).to.exist;
      expect(payload.attachment.type).to.equal('image');
      expect(payload.attachment.payload).to.exist;
      expect(payload.attachment.payload.url).to.equal(url);
    });

    it('creates a payload for a video that has not been uploaded to facebook', () => {
      const url = 'https://www.test.com/video.mp4';
      const payload = testModule.makePlatformMediaMessagePayload('video', url);
      expect(payload).to.exist;
      expect(payload.attachment).to.exist;
      expect(payload.attachment.type).to.equal('video');
      expect(payload.attachment.payload).to.exist;
      expect(payload.attachment.payload.url).to.equal(url);
    });

    it('creates a payload for a video that HAS been uploaded to facebook', () => {
      const url = 'https://www.test.com/video.mp4';
      let attachment_id = 'attachment_id_comes_from_facebook';
      const media = {video: [{url, attachment_id}]};
      const payload = testModule.makePlatformMediaMessagePayload('video', url, media);

      expect(payload).to.exist;
      expect(payload.attachment).to.exist;
      expect(payload.attachment.type).to.equal('video');
      expect(payload.attachment.payload).to.exist;
      expect(payload.attachment.payload.attachment_id).to.equal(attachment_id);
    });
  });
});

describe('message function tests', () => {
  it('getUpdateActionForUsers should update up to maxUpdate number', () => {
    const user = {
      introConversationSeen: true,
      history: [
        {
          type: TYPE_ANSWER,
          timestamp: moment().subtract(2, 'day').unix() * 1000,
          message: {text: "hi"},
          previous: undefined
        }
      ],
      invalidUser: false
    };
    const users = [];
    for (let i = 0; i < 10; i++) {
      users.push(user);
    }

    const allMessages = mocks.messages.slice();
    const allConversations = mocks.conversations.slice();
    const allCollections = mocks.collections.slice();

    const actions = testModule.getUpdateActionForUsers({
      users,
      allConversations,
      allCollections,
      allMessages,
      studyInfo: [],
      maxUpdates: 2,
    });
    expect(actions.length).to.be.at.most(2);

  });
});
