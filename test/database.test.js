const expect = require('chai').expect;
const moment = require('moment');
const rewire = require('rewire');
const sinon = require('sinon');

// const testModule = require('../src/messages');
const testModule = rewire('../src/database');
const usersModule = rewire('../src/users');
// const stub = sinon.stub(databaseModule, 'updateUser');
// stub.returns(true);
const displayErr =  err => {
  console.log("Error " + err);
};
testModule.returnNewOrOldUser = testModule.__get__('returnNewOrOldUser')
usersModule.createNewUser = usersModule.__get__('createNewUser')


const {
  TYPE_ANSWER,
  TYPE_MESSAGE,
  STOP_MESSAGE,
} = require('../src/constants');

const mocks = require('./mock');

describe('should not Receive Update', () => {
  it('create a new user if that user doesnt already exist', done => {
    testModule.returnNewOrOldUser({id: '123', user: null}).then(result => {
      const newUser = usersModule.createNewUser('123');
      expect(result.id).to.equal(newUser.id);
      expect(result.history).to.deep.equal(newUser.history);
      expect(result.progress).to.deep.equal(newUser.progress);
      done();
    })
      .catch(done);
  });

//   it('should not update if the user has set stopNotifications to true', () => {
//     const user = {
//       introConversationSeen: true,
//       history: [
//         {
//           type: TYPE_ANSWER,
//           timestamp: moment().subtract(2, 'day').unix() * 1000,
//           message: {text: "hi"},
//           previous: undefined
//         }
//       ],
//       stopNotifications: true,
//     };
//
//     expect(testModule.shouldReceiveUpdate(user, Date.now())).to.be.false;
//   });
// });
//
// xdescribe('should set User to stopNotifications with a STOP message', () => {
//   let facebookTestModule;
//   beforeEach(() => {
//     facebookTestModule.__set__("callSendAPI", () => true);
//   })
//
//   it('does not retur a promise if the user does not send \'stop\'', () => {
//     let message = {message: {id: "ryEn5QyZf", type: TYPE_MESSAGE, text: 'stops'}};
//     let allMessages = {allMessages: mocks.messages};
//     let user = { user: {
//       id: '1234',
//       introConversationSeen: true,
//       history: [
//         {
//           type: TYPE_ANSWER,
//           timestamp: Date.now(),
//           message: {text: "hi"},
//         }
//       ]
//     }};
//
//     let data = Object.assign({}, message, mocks, user, allMessages);
//     data.allConversations = data.conversations
//     delete data.conversations
//     let response = facebookTestModule.receivedMessage(data)
//     expect(response).equals(undefined)
//     expect(Promise.resolve(response)).not.equals(response)
//   });
//
//   it('returns a promise if the user sends \'stop\'', () => {
//     let message = {message: {id: "ryEn5QyZf", type: TYPE_MESSAGE, text: STOP_MESSAGE}};
//     let allMessages = {allMessages: mocks.messages};
//     let user = { user: {
//       introConversationSeen: true,
//       history: [
//         {
//           type: TYPE_ANSWER,
//           timestamp: Date.now(),
//           message: {text: "hi"},
//           previous: undefined
//         }
//       ]
//     }};
//
//     let data = Object.assign({}, message, mocks, user, allMessages);
//     let response = facebookTestModule.receivedMessage(data)
//     // a promise is returned by this function if it breaks early to update the user with a stopNotifications attr
//     expect(Promise.resolve(response)).equals(response)
//   });
})
