/* eslint-disable max-len */
const REST_PORT = process.env.REST_PORT || 5000;
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const FB_TEXT_LIMIT = 640;
const FB_GRAPH_ROOT_URL = 'https://graph.facebook.com/v2.6/';

const FB_ERROR_CODE_INVALID_USER = 100;
const FB_ERROR_CODE_UNAVAILABLE_USER = 551;
const FB_ERROR_CODE_UNAVAILABLE_USER_10 = 10;

// facebook messenger
const TYPING_TIME_IN_MILLISECONDS = 1000;
const FB_MESSAGE_TYPE = 'message';
const FB_TYPING_ON_TYPE = 'typing_on';
const FB_MESSAGING_TYPE_RESPONSE = 'RESPONSE';
const FB_MESSAGING_TYPE_UPDATE = 'UPDATE';

// database keys
// deprecated
const DB_USERS = 'users';
const DB_USER_LIST = 'userlist';
const DB_CONVERSATIONS = 'conversations';
const DB_COLLECTIONS = 'collections';
const DB_SERIES = 'series';
const DB_MESSAGES = 'messages';
const DB_MESSAGE_LIST = 'msglist';
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

const RESET_USER_RESPONSE_TYPE = 'RESET_USER_RESPONSE_TYPE';

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
const TYPE_STOP_NOTIFICATIONS = 'stopNotifications';

const STOP_MESSAGE = 'STOP';
const RESUME_MESSAGE = 'RESUME';
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
const ONE_WEEK_IN_SECONDS =  60 * 60 * 24 * 7;

const SECONDS_EXPIRE_ARG = 'EX'; // redis argument for setting expiry time. don't modify

const ONE_MONTH_IN_SECONDS =  60 * 60 * 24 * 7 * 4;
const EXPIRE_USER_AFTER = ONE_MONTH_IN_SECONDS;
// Special Messages
const QUICK_REPLY_RETRY_MESSAGE = "Sorry can’t compute! 🤖 Buttons plz. What would you like to do next?";
const QUICK_REPLY_RETRY_ID = 'quick-reply-retry-id';

const END_OF_CONVERSATION_MESSAGE = "Sorry! I’m hanging out with my bot friends for the rest of the day 💅🏽. Plus I want to make sure we talk a bit every day so you get the most out of our chats. Text me tomorrow!";
const UPDATE_USER_MESSAGE = "Hi! Don't forget about me!";
const CRISIS_RESPONSE_MESSAGE = "hey, I hope everything is ok. Your response included a few words that indicate you may be struggling. If you want to talk to a real person text Crisis Text Line at 741741 or call this hotline: 1-800-273-8255";
const CRISIS_RESPONSE_MESSAGE_FOR_BUTTONS = "I can't connect you directly to a human but if you text Crisis Text Line at m.me/crisistextline there is always someone there to help when you are struggling.";
const SUPPORT_MESSAGE = "I love feedback! Please type anything you'd like to send my human makers here in one message. Or you can e-mail my team at vivibot@hopelab.org";
// const SUPPORT_MESSAGE = "I can’t stop automatically but you can change your settings to turn me off like this:\n\nOn a phone: Click the settings gear in the top right corner. Then click “Manage Messages”. You can either turn off just notifications or all messages from me there.\n\nOn the computer: look for the “Options” panel to the right of our chat. Click either “Manage Messages” or “Notifications” from here to change your settings."
const STOP_NOTIFICATIONS = `Type ${STOP_MESSAGE} and I'll stop sending you notifications until you contact me by typing ${RESUME_MESSAGE}`;

const RESET_USER_QUESTION = 'Are you sure you want to wipe your history from my memory?🤖';

const RESET_USER_RESPONSE_CONFIRM = {
  title: "Yes, wipe it clean",
  text: "Yes, wipe it clean",
  id: 'reset-user-confirm',
};

const RESET_USER_RESPONSE_CANCEL = {
  title: 'Nope, resume normal flow',
  id: `reset-user-reject`,
  text: 'Nope, resume normal flow'
};

const RESET_USER_KEY_RESPONSE = [RESET_USER_RESPONSE_CONFIRM, RESET_USER_RESPONSE_CANCEL];

const RESET_USER_CONFIRM = 'Your user information has been completely reset 🤖';
const RESET_USER_KEY_MESSAGE = '#oz8mu[M7h9C6rsrNza9';

const QUICK_REPLY_RETRY_BUTTONS = [
  {
    title: "Continue chatting",
    id: `${QUICK_REPLY_RETRY_ID}-continue`,
  },
  {
    title: "Stop Notifications",
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

const STOPPED_MESSAGE = {
  type: FB_MESSAGE_TYPE,
  message: {
    text: `Ok, I will stop all messages. If you ever want to chat again just type ${RESUME_MESSAGE}`
  }
};

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

const STUDY_ID_LIST = [
  62702,51596,28800,86750,99975,77241,96263,70426,62826,12159,80321,58321,14182,71602,82029,84463,68550,52161,78127,92712,82295,50815,94219,63521,38977,35329,58569,85313,57391,21588,12191,21858,79395,22300,82957,96846,89041,49185,48305,28339,54198,21273,74829,12116,98187,69687,92133,72881,52730,88854,97566,39573,67468,74176,47356,79015,46301,35954,79350,48418,14299,53112,49651,52819,57535,60761,68106,49874,25102,73459,53363,41877,15601,53929,68922,64220,81614,67828,41110,64429,21086,42160,66111,39613,59580,44136,76742,23124,10643,80952,89985,39686,48225,38538,81666,55793,71649,58593,52393,62218,89899,53185,43206,34987,26069,83443,35142,27010,29567,37990,77745,22032,23673,31957,99869,30415,27294,16931,44702,70683,94532,65292,34508,78285,93378,12364,88149,58293,57745,92565,68637,60286,52821,84640,67558,22939,94424,26327,86344,87682,36278,11496,89913,43553,89975,54704,96613,72379,19563,19265,33206,29570,50342,72641,65296,71710,51357,41241,52941,91397,93093,91728,43772,29646,40514,96893,80074,86634,69153,17193,43508,98713,75090,91224,45454,62045,38366,82331,56230,36711,65353,63812,29872,14462,64372,77542,68043,23942,26929,59504,36916,83005,51520,39917,45347,67255,11810,77196,69843,92035
];

const STUDY_ID_NO_OP = 11111;

const STUDY_MESSAGES = [
  {
    text: "Please click the link below to officially sign up for the research study and earn $20. Your participant code is: XXXXX https://hopelab.az1.qualtrics.com/jfe/form/SV_3k19jeWjxbOu7Rz",
    delayInMinutes: 0
  },
  {
    text: "Please click the link below to complete your next research survey and earn $20. Your participant code is: XXXXX https://hopelab.az1.qualtrics.com/jfe/form/SV_6lNzDKnxkq89srP",
    delayInMinutes: 14 * 24 * 60
  },
  {
    text: "Please click the link below to complete your next research survey and earn $20. Your participant code is: XXXXX https://hopelab.az1.qualtrics.com/jfe/form/SV_8qOGrd5K5XYfpd3",
    delayInMinutes: 28 * 24 * 60
  },
  {
    text: "Please click the link below to complete your next research survey and earn $20. Your participant code is: XXXXX https://hopelab.az1.qualtrics.com/jfe/form/SV_6rnd5H14Ua9y71r",
    delayInMinutes: 56 * 24 * 60
  }
];

// hours from midnight (military time) eg 2 is 9am UTC (2am Pacific).
const CUT_OFF_HOUR_FOR_NEW_MESSAGES = 9;

const NUMBER_OF_UPDATE_MESSAGES_ALLOWED = 7;

// minutes of inactivty before update is sent
const MINUTES_OF_INACTIVITY_BEFORE_UPDATE_MESSAGE = (24 * 60) - 3;
const CRONTAB_FOR_MESSAGE_UPDATE_CHECK = '*/10 * * * *';

const CRONTAB_FOR_STUDY_MESSAGE_UPDATE = '0 */2 * * *';

const MAX_UPDATE_ACTIONS_ALLOWED = 20;

module.exports = {
  REST_PORT,
  FB_VERIFY_TOKEN,
  FB_PAGE_ACCESS_TOKEN,
  FB_TEXT_LIMIT,
  FB_GRAPH_ROOT_URL,
  FB_ERROR_CODE_INVALID_USER,
  FB_ERROR_CODE_UNAVAILABLE_USER,
  FB_ERROR_CODE_UNAVAILABLE_USER_10,
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
  CRONTAB_FOR_STUDY_MESSAGE_UPDATE,
  MAX_UPDATE_ACTIONS_ALLOWED,
  STUDY_ID_LIST,
  STUDY_ID_NO_OP,
  STUDY_MESSAGES,
  TYPE_STOP_NOTIFICATIONS,
  STOP_MESSAGE,
  RESUME_MESSAGE,
  STOPPED_MESSAGE,
  DB_USER_LIST,
  DB_MESSAGE_LIST,
  ONE_WEEK_IN_SECONDS,
  ONE_MONTH_IN_SECONDS,
  EXPIRE_USER_AFTER,
  SECONDS_EXPIRE_ARG,
  RESET_USER_KEY_MESSAGE,
  RESET_USER_RESPONSE_TYPE,
  RESET_USER_KEY_RESPONSE,
  RESET_USER_CONFIRM,
  RESET_USER_QUESTION,
  RESET_USER_RESPONSE_CONFIRM,
  RESET_USER_RESPONSE_CANCEL,
};
