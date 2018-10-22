const constants = require('../src/constants');
const { keyFormatMessageId } = require('../src/utils/msg_utils');

const { DB_MESSAGE_LIST, TYPE_MESSAGE, TYPE_BLOCK, TYPE_QUESTION, END_OF_CONVERSATION_ID } = constants;

const redis = require('redis');
const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

const END_OF_CONVERSATION_MESSAGE = "Sorry! I’m hanging out with my bot friends for the rest of the day 💅🏽. Plus I want to make sure we talk a bit every day so you get the most out of our chats. Text me tomorrow!";

const message = {
  name: 'End Of Conversation',
  text: END_OF_CONVERSATION_MESSAGE,
  id: END_OF_CONVERSATION_ID,
  messageType: TYPE_QUESTION,
  parent: {
    id: 'end-of-conversation-parent-id',
    type: TYPE_BLOCK,
  },
  type: TYPE_MESSAGE,
};

redisClient.lpush(DB_MESSAGE_LIST, END_OF_CONVERSATION_ID);
const messagePromise = redisClient.set(keyFormatMessageId(message.id), JSON.stringify(message));

Promise.resolve(messagePromise).then(() => {
  redisClient.quit();
  setTimeout(() => {
    process.exit(0);
  }, 3000);
});
