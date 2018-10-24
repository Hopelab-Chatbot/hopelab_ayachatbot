const constants = require('../src/constants');
const { keyFormatMessageId } = require('../src/utils/msg_utils');

const { QUICK_REPLY_RETRY_MESSAGE, QUICK_REPLY_RETRY_ID, DB_MESSAGE_LIST, TYPE_MESSAGE, TYPE_BLOCK, TYPE_QUESTION, TYPE_STOP_NOTIFICATIONS, TYPE_BACK_TO_CONVERSATION,
  TYPE_QUESTION_WITH_REPLIES, DB_ORDER_LIST, QUICK_REPLY_BLOCK_ID, STOP_NOTIFICATIONS } = constants;

const CRISIS_RESPONSE_MESSAGE_FOR_BUTTONS = "I can't connect you directly to a human but if you text Crisis Text Line at m.me/crisistextline there is always someone there to help when you are struggling.";

const SUPPORT_MESSAGE = "I love feedback! Please type anything you'd like to send my human makers here in one message. Or you can e-mail my team at vivibot@hopelab.org";

const STOP_NOTIFICATIONS_TITLE = 'Stop Notifications';

const QUICK_REPLY_RETRY_BUTTONS = [
  {
    title: "Continue chatting",
    id: `${QUICK_REPLY_RETRY_ID}-continue`,
    type: TYPE_BACK_TO_CONVERSATION,
  },
  {
    title: STOP_NOTIFICATIONS_TITLE,
    id: `${QUICK_REPLY_RETRY_ID}-stop-notifications`,
    text: STOP_NOTIFICATIONS,
    type: TYPE_STOP_NOTIFICATIONS,
  },
  {
    title: "Talk to a human",
    id: `${QUICK_REPLY_RETRY_ID}-talk-to-human`,
    text: CRISIS_RESPONSE_MESSAGE_FOR_BUTTONS
  },
  {
    title: "Send Feedback",
    id: `${QUICK_REPLY_RETRY_ID}-send-feedback`,
    text: SUPPORT_MESSAGE
  }
];

const redis = require('redis');
const config = require('config');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

const quick_replies = QUICK_REPLY_RETRY_BUTTONS
  .map(qr => ({
    content_type: "text",
    title: qr.title,
    next: {
      id: qr.id,
      type: TYPE_QUESTION,
    },
    payload: JSON.stringify({id: qr.id, type: TYPE_MESSAGE})
  }));

const nextMessages = QUICK_REPLY_RETRY_BUTTONS.map(qr =>
  ({
    name: qr.title,
    text: qr.text,
    id: qr.id,
    messageType: TYPE_QUESTION,
    parent: {
      id: QUICK_REPLY_BLOCK_ID,
      type: TYPE_BLOCK,
    },
    type: TYPE_MESSAGE,
    next: {
      type: TYPE_BACK_TO_CONVERSATION,
    }
  }));

const msg = {
  text: QUICK_REPLY_RETRY_MESSAGE,
  id: QUICK_REPLY_RETRY_ID,
  messageType: TYPE_QUESTION_WITH_REPLIES,
  parent: {
    id: QUICK_REPLY_BLOCK_ID,
    type: TYPE_BLOCK,
  },
  type: TYPE_MESSAGE,
  name: 'Quick Reply Retry Response',
  quick_replies
};

const idList = [...nextMessages, msg].map(({id}) => id);
redisClient.lpush(DB_MESSAGE_LIST, ...idList);
redisClient.lpush(DB_ORDER_LIST, QUICK_REPLY_BLOCK_ID);
const messagePromises = [...nextMessages, msg]
  .map(message => redisClient.set(keyFormatMessageId(message.id), JSON.stringify(message)));
const order = redisClient.set(`order:${QUICK_REPLY_BLOCK_ID}`,
  JSON.stringify({id: QUICK_REPLY_BLOCK_ID, ordering: [QUICK_REPLY_RETRY_ID, ...idList]}));

Promise.all([...messagePromises, order]).then(() => {
  redisClient.quit();
  setTimeout(() => {
    process.exit(0);
  }, 3000);
});
