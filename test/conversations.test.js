const expect = require('chai').expect;
const {
  STUDY_ID_NO_OP,
} = require('../src/constants');
const mocks = require('./mock');

const testModule = require('../src/conversations');

const createModifiedMocks = mocks => {
  let modifiedMocks = Object.assign(
    {},
    mocks,
    {messages: mocks.messages.slice()},
    {conversations: mocks.conversations.slice()}
  );

  modifiedMocks.user = {
    introConversationSeen: true,
    assignedConversationTrack: 'intro-conversation',
    history: [],
  };

  return modifiedMocks;
};

describe('newConversationTrack function', () => {
  let conversations,
    messages,
    collections,
    studyInfo,
    user;
  beforeEach(() => {
    ({conversations, messages, collections, user} = createModifiedMocks(mocks));
    conversations.push({
      type: "conversation",
      "name":"Study routing",
      "userId":"",
      "id":"study-conversation",
      "isStudy":true,
      "isLive":true
    });
    studyInfo = [ '12345' ];
  });
  it('should correctly assign new user to intro conversation', () => {
    conversations = [conversations.find(c => c.id === 'intro-conversation')];
    const {action, block, user: newUser} =
    testModule.newConversationTrack(conversations, messages, collections, studyInfo, user);
    expect(action.type).to.equal('message');
    expect(block).to.equal('intro-block');
    expect(newUser.history).to.deep.equal([]);
    expect(newUser.introConversationSeen).to.equal(true);
    expect(newUser.assignedConversationTrack).to.equal('intro-conversation');
  });

  it('should route to study correctly', () => {
    const transToStudyUser = require('./mock/transToStudyUser');
    expect(transToStudyUser.studyId).to.equal(undefined);
    transToStudyUser.assignedConversationTrack = undefined;
    conversations = [conversations.find(c => c.id === 'study-conversation')];
    const { user: newUser } =
    testModule.newConversationTrack(conversations, messages, collections, studyInfo, transToStudyUser);
    expect(newUser.studyId).to.have.length(5);
    expect(newUser.studyId).to.not.equal(studyInfo[0]);
    expect(newUser.studyId).to.not.equal(STUDY_ID_NO_OP);
  });
});
