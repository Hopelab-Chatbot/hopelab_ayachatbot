const expect = require('chai').expect;
const rewire = require('rewire');
const {
  STUDY_ID_LIST,
  FB_MESSAGING_TYPE_RESPONSE
} = require('../src/constants');
const validStudyId = STUDY_ID_LIST[0];

const testModule = rewire('../src/facebook');

testModule.userIsStartingStudy = testModule.__get__('userIsStartingStudy');
testModule.createMessagePayload = testModule.__get__('createMessagePayload');


describe('facebook module test suite', () => {
  it('should not show as user is starting study if user does not have a study id', () => {
    expect(testModule.userIsStartingStudy({})).to.be.false;
  });
  it('should show as user is starting study if user has a study id', () => {
    expect(testModule.userIsStartingStudy({studyId: validStudyId })).to.be.false;
  });

  it('createMessagePayload should return a valid message', () => {
    const messagePL = testModule.createMessagePayload(
      '123',
      {},
      FB_MESSAGING_TYPE_RESPONSE
    );
    expect(messagePL).to.deep.equal({
      "messaging_type": "RESPONSE",
      "recipient": {
        "id": "123"
      }
    });
  });
});
