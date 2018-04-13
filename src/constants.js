const REST_PORT = process.env.PORT || 5000;
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const FB_TEXT_LIMIT = 640;
const FB_GRAPH_ROOT_URL = 'https://graph.facebook.com/v2.6/';

const FB_ERROR_CODE_INVALID_USER = 100;

// facebook messenger
const TYPING_TIME_IN_MILLISECONDS = 1000;
const FB_MESSAGE_TYPE = 'message';
const FB_TYPING_ON_TYPE = 'typing_on';
const FB_MESSAGING_TYPE_RESPONSE = 'RESPONSE';
const FB_MESSAGING_TYPE_UPDATE = 'UPDATE';

// database keys
const DB_USERS = 'users';
const DB_CONVERSATIONS = 'conversations';
const DB_COLLECTIONS = 'collections';
const DB_SERIES = 'series';
const DB_MESSAGES = 'messages';
const DB_USER_HISTORY = 'user-history';
const DB_BLOCKS = 'blocks';
const DB_MEDIA = 'media';
const DB_STUDY = 'study';

// Special actions
const ACTION_RETRY_QUICK_REPLY = 'ACTION_RETRY_QUICK_REPLY';
const ACTION_REPLAY_PREVIOUS_MESSAGE = 'ACTION_REPLAY_PREVIOUS_MESSAGE';
const ACTION_COME_BACK_LATER = 'ACTION_COME_BACK_LATER';
const ACTION_NO_UPDATE_NEEDED = 'ACTION_NO_UPDATE_NEEDED';
const ACTION_CRISIS_REPONSE = 'ACTION_CRISIS_REPONSE';
const ACTION_QUICK_REPLY_RETRY_NEXT_MESSAGE = 'ACTION_QUICK_REPLY_RETRY_NEXT_MESSAGE';

const END_OF_CONVERSATION_ID = 'END-OF-CONVERSATION-ID';

// data types
const TYPE_CONVERSATION = 'conversation';
const TYPE_COLLECTION = 'collection';
const TYPE_MESSAGE = 'message';
const TYPE_QUESTION = 'question';
const TYPE_QUESTION_WITH_REPLIES = 'questionWithReplies';
const TYPE_BLOCK = 'block';
const TYPE_SERIES = "series";
const TYPE_IMAGE = 'image';
const TYPE_VIDEO = 'video';
const TYPE_ANSWER = 'answer';
const MESSAGE_TYPE_TRANSITION = 'transition';
const MESSAGE_TYPE_TEXT = 'text';

// entity keys
const INTRO_CONVERSATION_ID = 'intro-conversation';
const INTRO_BLOCK_ID = 'intro-block';

// LOGIC RULES
const LOGIC_SEQUENTIAL = 'sequential';
const LOGIC_RANDOM = 'random';

// user data keys
const COLLECTION_SCOPE = 'collection-scope';
const COLLECTION_PROGRESS = 'collection-progress';
const SERIES_PROGRESS = 'series-progress';
const SERIES_SEEN = 'series-seen';
const BLOCKS_SEEN = 'blocks-seen';

// caching time
const ONE_DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24;
const ONE_WEEK_IN_MILLISECONDS = 1000 * 60 * 60 * 24 * 7 * 4;

// Special Messages
const QUICK_REPLY_RETRY_MESSAGE = "Sorry can’t compute! 🤖 Buttons plz. What would you like to do next?";
const QUICK_REPLY_RETRY_ID = 'quick-reply-retry-id';

const END_OF_CONVERSATION_MESSAGE = "Sorry! I’m hanging out with my bot friends for the rest of the day 💅. Plus I want to make sure we talk a bit every day so you get the most out of our chats. Text me tomorrow!";
const UPDATE_USER_MESSAGE = "Hi! Don't forget about me!";
const CRISIS_RESPONSE_MESSAGE = "hey, I hope everything is ok. Your response included a few words that indicate you may be struggling. If you want to talk to a real person text Crisis Text Line at 741741 or call this hotline: 1-800-273-8255";
const CRISIS_RESPONSE_MESSAGE_FOR_BUTTONS = "I can't connect you directly to a human but if you text Crisis Text Line at 741741 there is always someone there to help when you are struggling."
const SUPPORT_MESSAGE = "I love feedback! Please type anything you'd like to send my human makers here in one message. Or you can e-mail my team at vivibot@hopelab.org"

const QUICK_REPLY_RETRY_BUTTONS = [
  {
    title: "Continue chatting",
    id: `${QUICK_REPLY_RETRY_ID}-continue`,
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

// Crisis Keywords
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

// hours from midnight (military time) eg 2 is 2am.
const CUT_OFF_HOUR_FOR_NEW_MESSAGES = 2;

const NUMBER_OF_UPDATE_MESSAGES_ALLOWED = 7;

// minutes of inactivty before update is sent
const MINUTES_OF_INACTIVITY_BEFORE_UPDATE_MESSAGE = (24 * 60) + 3;
const CRONTAB_FOR_MESSAGE_UPDATE_CHECK = '*/10 * * * *';

const MAX_UPDATE_ACTIONS_ALLOWED = 10;

module.exports = {
    REST_PORT,
    FB_VERIFY_TOKEN,
    FB_PAGE_ACCESS_TOKEN,
    FB_TEXT_LIMIT,
    FB_GRAPH_ROOT_URL,
    FB_ERROR_CODE_INVALID_USER,
    DB_USERS,
    DB_CONVERSATIONS,
    DB_COLLECTIONS,
    DB_SERIES,
    DB_MESSAGES,
    DB_BLOCKS,
    DB_MEDIA,
    DB_USER_HISTORY,
    DB_STUDY,
    ACTION_RETRY_QUICK_REPLY,
    ACTION_COME_BACK_LATER,
    ACTION_NO_UPDATE_NEEDED,
    ACTION_CRISIS_REPONSE,
    ACTION_QUICK_REPLY_RETRY_NEXT_MESSAGE,
    ACTION_REPLAY_PREVIOUS_MESSAGE,
    END_OF_CONVERSATION_ID,
    QUICK_REPLY_RETRY_MESSAGE,
    QUICK_REPLY_RETRY_BUTTONS,
    QUICK_REPLY_RETRY_ID,
    CRISIS_RESPONSE_MESSAGE_FOR_BUTTONS,
    SUPPORT_MESSAGE,
    END_OF_CONVERSATION_MESSAGE,
    UPDATE_USER_MESSAGE,
    CRISIS_RESPONSE_MESSAGE,
    CRISIS_KEYWORDS,
    TYPE_ANSWER,
    TYPE_CONVERSATION,
    TYPE_COLLECTION,
    TYPE_MESSAGE,
    TYPE_QUESTION,
    TYPE_QUESTION_WITH_REPLIES,
    TYPE_BLOCK,
    TYPE_SERIES,
    TYPE_IMAGE,
    TYPE_VIDEO,
    MESSAGE_TYPE_TEXT,
    MESSAGE_TYPE_TRANSITION,
    ONE_DAY_IN_MILLISECONDS,
    ONE_WEEK_IN_MILLISECONDS,
    TYPING_TIME_IN_MILLISECONDS,
    FB_MESSAGE_TYPE,
    FB_TYPING_ON_TYPE,
    FB_MESSAGING_TYPE_RESPONSE,
    FB_MESSAGING_TYPE_UPDATE,
    INTRO_CONVERSATION_ID,
    INTRO_BLOCK_ID,
    LOGIC_SEQUENTIAL,
    LOGIC_RANDOM,
    COLLECTION_PROGRESS,
    SERIES_PROGRESS,
    SERIES_SEEN,
    BLOCKS_SEEN,
    COLLECTION_SCOPE,
    CUT_OFF_HOUR_FOR_NEW_MESSAGES,
    NUMBER_OF_UPDATE_MESSAGES_ALLOWED,
    MINUTES_OF_INACTIVITY_BEFORE_UPDATE_MESSAGE,
    CRONTAB_FOR_MESSAGE_UPDATE_CHECK,
    MAX_UPDATE_ACTIONS_ALLOWED
};
