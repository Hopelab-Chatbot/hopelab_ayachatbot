const expect = require('chai').expect;
const rewire = require('rewire');

const testModule = rewire('../src/database');
const usersModule = rewire('../src/users');

testModule.returnNewOrOldUser = testModule.__get__('returnNewOrOldUser');
testModule.setUserInCache = testModule.__get__('setUserInCache');
testModule.removeUserFromCache = testModule.__get__('removeUserFromCache');
testModule.getJSONItemFromCache = testModule.__get__('getJSONItemFromCache');

usersModule.createNewUser = usersModule.__get__('createNewUser');


describe('database user module functions', () => {
  // doesn't actually create new user, just creates format to compare against
  const testUser = usersModule.createNewUser('123');
  const testUser2 = usersModule.createNewUser('321');
  it('returnNewOrOldUser should create a new user if that user doesnt already exist', done => {
    testModule.returnNewOrOldUser({id: '123', user: null}).then(result => {
      expect(result.id).to.equal(testUser.id);
      expect(result.history).to.deep.equal(testUser.history);
      expect(result.progress).to.deep.equal(testUser.progress);
      testModule.returnNewOrOldUser({id: '321', user: null}).then(result => {
        expect(result.id).to.equal(testUser2.id);
        expect(result.history).to.deep.equal(testUser2.history);
        expect(result.progress).to.deep.equal(testUser2.progress);
        done();
      });
    })

      .catch(done);
  });

  it('setUserInCache should update the user', done => {
    testModule.getUserById('123').then(user => {
      expect(testUser).to.deep.equal(user);
      const userToUpdate = Object.assign(user, {foo: 'bar'});
      testModule.setUserInCache(userToUpdate);
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

  it('updateUser should update the user', done => {
    testModule.updateUser(Object.assign({}, testUser, {foo: 'baz'})).then(() => {
      testModule.getUserById(testUser.id).then(user => {
        expect(user.id).to.equal(testUser.id);
        expect(user.foo).to.equal('baz');
        expect(user.foo).to.not.equal('bar');
        done();
      })
        .catch(done);
    })
      .catch(done);
  });

  it('updateAllUsers should update all users in array, get users should get all users', done => {
    testModule.updateAllUsers(
      [Object.assign({}, testUser, {foo: 'bop'}),Object.assign({}, testUser2, {foo: 'bar'})]
    ).then(() => {
      testModule.getUsers().then(res => {
        const firstTestUser = res.find(u => u.id === testUser.id);
        const secondTestUser = res.find(u => u.id === testUser2.id);
        expect(firstTestUser.id).to.equal(testUser.id);
        expect(firstTestUser.foo).to.equal('bop');
        expect(firstTestUser.foo).to.not.equal('bar');
        expect(secondTestUser.id).to.equal(testUser2.id);
        expect(secondTestUser.foo).to.equal('bar');
        expect(secondTestUser.foo).to.not.equal('bop');
        done();
      })
        .catch(done);
    })
      .catch(done);
  });

  // clean up the user
  it('removeUserFromCache should delete the user', done => {
    testModule.removeUserFromCache(testUser);
    testModule.removeUserFromCache(testUser2);
    testModule.getJSONItemFromCache(testUser.id).then(result => {
      expect(result).to.equal(null);
      testModule.getJSONItemFromCache(testUser2.id).then(result => {
        expect(result).to.equal(null);
        done();
      });
    })
      .catch(done);
  });
});

describe('database non-user module functions', () => {
  it('getConversations should return successfully', done => {
    testModule.getConversations().then(res => {
      expect(res).to.not.equal(null);
      done();
    });
  });
  it('getCollections should return successfully', done => {
    testModule.getCollections().then(res => {
      expect(res).to.not.equal(null);
      done();
    });
  });
  it('getSeries should return successfully', done => {
    testModule.getSeries().then(res => {
      expect(res).to.not.equal(null);
      done();
    });
  });
  it('getMessages should return successfully', done => {
    testModule.getMessages().then(res => {
      expect(res).to.not.equal(null);
      done();
    });
  });
  it('getBlocks should return successfully', done => {
    testModule.getBlocks().then(res => {
      expect(res).to.not.equal(null);
      done();
    });
  });
  it('getMedia should return successfully', done => {
    testModule.getMedia().then(res => {
      expect(res).to.not.equal(null);
      done();
    });
  });
  it('getStudyInfo should return successfully, and set study info should return correctly', done => {
    testModule.getStudyInfo().then(res => {
      expect(res).to.not.equal(null);
      testModule.setStudyInfo(res).then(result => {
        expect(result).to.not.equal(null);
        done();
      });
    });
  });
});
