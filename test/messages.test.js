const expect = require('chai').expect;
const testModule = require('../src/messages');
const {
  TYPE_BLOCK,
  TYPE_ANSWER,
  TYPE_QUESTION,
  TYPE_QUESTION_WITH_REPLIES,
  TYPE_MESSAGE,
  TYPE_CONVERSATION,
  MESSAGE_TYPE_TRANSITION,
  INTRO_CONVERSATION_ID,
} = require('../src/constants');

const mocks = require('./mock');
const usersModule = require('../src/users');

const media = require('../stubs/media.json');

const createModifiedMocksForTransition = (mocks) => {
  let modifiedMocks = Object.assign(
    {},
    mocks,
    {messages: mocks.messages.slice()},
    {conversations: mocks.conversations.slice()},
  );

  const conversationId = '54321abcdefg';

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
    nextConversations: [{id: conversationId, text: 'hi'}]
  });
  const previousMessage = {
    id: 'previous123456',
    type: TYPE_MESSAGE,
    messageType: TYPE_QUESTION,
    text: "Stuff",
    next: {id: transitionId, type: TYPE_MESSAGE},
    parent: {type: TYPE_CONVERSATION, id: "intro-conversation"}
  }
  modifiedMocks.messages.push(previousMessage);

  modifiedMocks.user = {
    introConversationSeen: true,
    assignedConversationTrack: 'intro-conversation',
    history: [
      previousMessage,
      {
        type: TYPE_ANSWER,
        timestampe: Date.now(),
        message: {text: "stuff"},
        previous: previousMessage.id
      }
    ]
  };

  return modifiedMocks;
}

describe('Messages Module', () => {
    it('should have an getActionForMessage function', () => {
        expect(typeof testModule.getActionForMessage).to.equal('function');
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
            const qrSolutions = messages[2].quick_replies;
            expect(message.quick_replies.length).to.equal(1);
            expect(message.quick_replies[0].title).to.be.undefined;
            expect(message.quick_replies[0].payload).to.equal("{}")
        });
    });

    describe('getActionForMessage', () => {
      describe('empty user history', () => {
        it('gets intro seen state set in user update', () => {
            const data = Object.assign({}, {user: { history: [] }}, mocks);
            const {action, userActionUpdates} = testModule.getActionForMessage(data);
            expect(userActionUpdates).to.not.be.undefined;
            expect(userActionUpdates).to.have.all.keys('history', 'introConversationSeen');
            expect(userActionUpdates.introConversationSeen).to.be.true;
        });

        it('starts with the first intro message', () => {
          const data = Object.assign({}, {user: { history: [] }}, mocks);
          const {action, userActionUpdates} = testModule.getActionForMessage(data);
          expect(action).to.not.be.undefined;
          expect(action).to.have.all.keys('id', 'type');
          expect(action.type).to.eq(TYPE_MESSAGE);
          const firstIntroMessage = mocks.messages.find(m => (
            m.start && m.parent && m.parent.id === INTRO_CONVERSATION_ID
          ));
          expect(action.id).to.eq(firstIntroMessage.id);
        })
      });

      it('starts in the assigned conversation track', () => {
        let user = { user: {
          introConversationSeen: true,
          assignedConversationTrack: 'r1IJzNy-G',
          history: [
            {
              type: TYPE_ANSWER,
              timestampe: Date.now(),
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

      it('gets the appropriate action for a transition', () => {
        let modifiedMocks = createModifiedMocksForTransition(mocks);
        const {action, userActionUpdates} = testModule.getActionForMessage(modifiedMocks);

        expect(action).to.exist;
        let transitionMessage = modifiedMocks.messages.find(
          m => m.messageType === MESSAGE_TYPE_TRANSITION
        );
        expect(action.id).to.equal(transitionMessage.id);
        expect(action.type).to.equal(TYPE_MESSAGE);
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
                timestampe: Date.now(),
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
                timestampe: Date.now(),
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
          const {messagesToSend, userUpdates} = testModule.getMessagesForAction(data);

          expect(messagesToSend).to.exist;
          expect(Array.isArray(messagesToSend)).to.be.true;
          expect(messagesToSend.length).to.equal(1);
          expect(messagesToSend[0].message.text).to.equal("More stuff");
        });

        it('handles transitions with text', () => {
          let modifiedMocks = createModifiedMocksForTransition(mocks);
          const transitionText = "message from transition";
          const messagesWithTransitionText = modifiedMocks.messages.map(m => (
            m.messageType === MESSAGE_TYPE_TRANSITION ? {
              ...m,
              text: transitionText
            } : m
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
          expect(messagesToSend[0].message.text).to.equal(transitionText)
          expect(messagesToSend[1].message.text).to.equal("More stuff");
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
      })

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
      })
    });
});
