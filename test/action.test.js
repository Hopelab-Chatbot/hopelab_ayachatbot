const expect = require('chai').expect;

const testModule = require('../src/action');
const { createModifiedMocksForTransition } = require('./utils');

const {
  TYPE_ANSWER,
  TYPE_MESSAGE,
  MESSAGE_TYPE_TRANSITION,
  INTRO_CONVERSATION_ID,
  RESET_USER_RESPONSE_TYPE
} = require('../src/constants');

const mocks = require('./mock');


describe('getActionForMessage', () => {
  it('should have an getActionForMessage function', () => {
    expect(typeof testModule.getActionForMessage).to.equal('function');
  });

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
