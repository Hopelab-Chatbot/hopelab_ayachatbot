const expect = require('chai').expect;
const moment = require('moment');
const rewire = require('rewire');
const sinon = require('sinon');
// const config = require('config');

// const redis = require('redis');
//
// const redisClient = redis.createClient({
//   host: config.redis.host,
//   port: config.redis.port
// });
// const {promisify} = require('util');
//
// const getAsync = promisify(redisClient.get).bind(redisClient);


// const testModule = require('../src/messages');
const testModule = rewire('../src/database');
const usersModule = rewire('../src/users');
// const stub = sinon.stub(databaseModule, 'updateUser');
// stub.returns(true);
const displayErr =  err => {
  console.log("Error " + err);
};
testModule.returnNewOrOldUser = testModule.__get__('returnNewOrOldUser')
testModule.setUserInCache = testModule.__get__('setUserInCache')

usersModule.createNewUser = usersModule.__get__('createNewUser')


const {
  TYPE_ANSWER,
  TYPE_MESSAGE,
  STOP_MESSAGE,
} = require('../src/constants');

const mocks = require('./mock');

describe('database module functions', () => {
  const testUser = usersModule.createNewUser('123');
  it('returnNewOrOldUser should create a new user if that user doesnt already exist', done => {
    testModule.returnNewOrOldUser({id: '123', user: null}).then(result => {
      expect(result.id).to.equal(testUser.id);
      expect(result.history).to.deep.equal(testUser.history);
      expect(result.progress).to.deep.equal(testUser.progress);
      done();
    })
      .catch(done);
  });

  it('setUserInCache should update the user', done => {
    testModule.getUserById('123').then(user => {
      expect(testUser).to.deep.equal(user);
      const userToUpdate = Object.assign(user, {foo: 'bar'})
      testModule.setUserInCache(userToUpdate)
      testModule.getUserById('123').then(result => {
        expect(result.id).to.equal(testUser.id);
        expect(result.history).to.deep.equal(testUser.history);
        expect(result.progress).to.deep.equal(testUser.progress);
        expect(result.foo).to.deep.equal('bar');
        done();
      })
        .catch(done);
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
