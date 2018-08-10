const expect = require('chai').expect;
const rewire = require('rewire');

const testModule = rewire('../src/database');
const usersModule = rewire('../src/users');

testModule.returnNewOrOldUser = testModule.__get__('returnNewOrOldUser')
testModule.setUserInCache = testModule.__get__('setUserInCache')
testModule.removeUserFromCache = testModule.__get__('removeUserFromCache')
testModule.getJSONItemFromCache = testModule.__get__('getJSONItemFromCache')

usersModule.createNewUser = usersModule.__get__('createNewUser')


describe('database module functions', () => {
  // create new user
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
      testModule.getUserById(testUser.id).then(result => {
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

  // clean up the user
  it('removeUserFromCache should delete the user', done => {
    testModule.removeUserFromCache(testUser)
    testModule.getJSONItemFromCache(testUser.id).then(result => {
      expect(result).to.equal(null)
      done();
    })
      .catch(done);
  });
})
