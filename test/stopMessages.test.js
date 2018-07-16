const expect = require('chai').expect;
const moment = require('moment');
const rewire = require('rewire');
const sinon = require('sinon');

const testModule = require('../src/messages');
const facebookTestModule = rewire('../src/facebook');
const databaseModule = require('../src/database');
const stub = sinon.stub(databaseModule, 'updateUser');
stub.returns(true);

const {
  TYPE_ANSWER,
  TYPE_MESSAGE,
  STOP_MESSAGE,
} = require('../src/constants');

const mocks = require('./mock');

describe('should not Receive Update', () => {
  it('should not update if the user is not defined', () => {
    expect(testModule.shouldReceiveUpdate()).to.be.false;
  });

  it('should not update if the user has set stopNotifications to true', () => {
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
      stopNotifications: true,
    };

    expect(testModule.shouldReceiveUpdate(user, Date.now())).to.be.false;
  });
});

describe('should set User to stopNotifications with a STOP message', () => {
  beforeEach(() => {
    facebookTestModule.__set__("callSendAPI", stub);
  })

  it('does not retur a promise if the user does not send \'stop\'', () => {
    let message = {message: {id: "ryEn5QyZf", type: TYPE_MESSAGE, text: 'stops'}};
    let allMessages = {allMessages: mocks.messages};
    let user = { user: {
      id: '1234',
      introConversationSeen: true,
      history: [
        {
          type: TYPE_ANSWER,
          timestamp: Date.now(),
          message: {text: "hi"},
        }
      ]
    }};

    let data = Object.assign({}, message, mocks, user, allMessages);
    data.allConversations = data.conversations
    delete data.conversations
    let response = facebookTestModule.receivedMessage(data)
    expect(response).equals(undefined)
    expect(Promise.resolve(response)).not.equals(response)
  });

  it('returns a promise if the user sends \'stop\'', () => {
    let message = {message: {id: "ryEn5QyZf", type: TYPE_MESSAGE, text: STOP_MESSAGE}};
    let allMessages = {allMessages: mocks.messages};
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

    let data = Object.assign({}, message, mocks, user, allMessages);
    let response = facebookTestModule.receivedMessage(data)
    // a promise is returned by this function if it breaks early to update the user with a stopNotifications attr
    expect(Promise.resolve(response)).equals(response)
  });
})
