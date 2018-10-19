const constants = require('../src/constants');
const { keyFormatMessageId } = require('../src/utils/msg_utils');

const { STOP_SEARCH_TERM_LIST, STOP_SEARCH_WORD_LIST, STOP_MESSAGE_ID, DB_MESSAGE_LIST, TYPE_MESSAGE,
  TYPE_BLOCK, TYPE_QUESTION, TYPE_BACK_TO_CONVERSATION, RESUME_MESSAGE_ID } = constants;

const STOP_NOTIFICATIONS_TITLE = 'Stop Notifications';

const STOP_MESSAGE = 'STOP';

const RESUME_MESSAGE = 'RESUME';

const STOP_MESSAGES = [
  STOP_MESSAGE,
  STOP_NOTIFICATIONS_TITLE,
  'cancel',
  'unsubscribe',
  'shut up',
  'leave me alone',
  'bitch',
  'quit',
];

const CURSING_STOP_TRIGGERS = [
  'dick',
  'block me',
  'block you',
  'blow',
  'delete',
  'deleting',
  'fuck off',
  'the fuck',
  'fuck u',
  'fuck you',
  'go away',
  'please stop',
  'quit messaging',
  'reporting',
  'spamming',
  'stop messaging',
  'stop notifications',
  'stop receiving messages',
  'stop sending',
  'stop texting',
  'stop talking',
  'stop bitch',
];

const STOP_MESSAGE_RESPONSE = 'Your message indicated that you would like to stop all messages. If this is a mistake or you ever want to chat again just type ${RESUME_MESSAGE}';

const redis = require('redis');
const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

const message = {
  name: 'Stop',
  text: STOP_MESSAGE_RESPONSE,
  id: STOP_MESSAGE_ID,
  messageType: TYPE_QUESTION,
  parent: {
    id: 'stop-parent-id',
    type: TYPE_BLOCK,
  },
  type: TYPE_MESSAGE,
  next: {
    type: TYPE_BACK_TO_CONVERSATION,
  }
};

const resumeMessage = {
  name: 'Resume Message',
  text: RESUME_MESSAGE,
  id: RESUME_MESSAGE_ID,
  parent: {
    id: 'stop-parent-id',
    type: TYPE_BLOCK,
  },
  messageType:"question",
  type: "message",
  next: {
    type: TYPE_BACK_TO_CONVERSATION,
  }
};

redisClient.lpush(STOP_SEARCH_TERM_LIST, ...CURSING_STOP_TRIGGERS);
redisClient.lpush(STOP_SEARCH_WORD_LIST, ...STOP_MESSAGES);
redisClient.lpush(DB_MESSAGE_LIST, STOP_MESSAGE_ID, RESUME_MESSAGE_ID);
const messagePromises = [message, resumeMessage].map(m => redisClient.set(keyFormatMessageId(m.id), JSON.stringify(m)));

Promise.resolve(messagePromises).then(() => {
  redisClient.quit();
  setTimeout(() => {
    process.exit(0);
  }, 3000);
});
