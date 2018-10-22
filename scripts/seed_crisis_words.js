const constants = require('../src/constants');
const { keyFormatMessageId } = require('../src/utils/msg_utils');

const { CRISIS_RESPONSE_MESSAGE_ID, DB_MESSAGE_LIST, TYPE_MESSAGE, CRISIS_SEARCH_WORD_LIST, CRISIS_BLOCK_ID,
  TYPE_BLOCK, TYPE_QUESTION, TYPE_BACK_TO_CONVERSATION, CRISIS_SEARCH_TERM_LIST } = constants;

const CRISIS_KEYWORDS = [
  'suicide',
  'kill',
  'hurt myself',
  'don\'t want to live',
  'bridge',
  'what is the point',
  'whats the point',
  'harm',
  'hurt',
  'hurting',
  'gun'
];

const CRISIS_RESPONSE_MESSAGE = "hey, I hope everything is ok. Your response included a few words that indicate you may be struggling. If you want to talk to a real person text Crisis Text Line at 741741 or call this hotline: 1-800-273-8255";

const redis = require('redis');
const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

const message = {
  name: 'Crisis',
  text: CRISIS_RESPONSE_MESSAGE,
  id: CRISIS_RESPONSE_MESSAGE_ID,
  messageType: TYPE_QUESTION,
  parent: {
    id: CRISIS_BLOCK_ID,
    type: TYPE_BLOCK,
  },
  type: TYPE_MESSAGE,
  next: {
    type: TYPE_BACK_TO_CONVERSATION,
  }
};

redisClient.lpush(CRISIS_SEARCH_TERM_LIST, ...CRISIS_KEYWORDS);
redisClient.lpush(DB_MESSAGE_LIST, CRISIS_RESPONSE_MESSAGE_ID);
const messagePromises = redisClient.set(keyFormatMessageId(message.id), JSON.stringify(message));

Promise.resolve(messagePromises).then(() => {
  redisClient.quit();
  setTimeout(() => {
    process.exit(0);
  }, 3000);
});
