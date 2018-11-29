/* eslint-disable max-len */
const REST_PORT = process.env.REST_PORT || 5000;
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const FB_APP_ID = process.env.FB_APP_ID;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_TEXT_LIMIT = 640;
const FB_GRAPH_TRUE_ROOT = 'https://graph.facebook.com/';
const FB_GRAPH_ROOT_URL = `${FB_GRAPH_TRUE_ROOT}v2.6/`;
const FB_ACTIVITIES_URL = '/activities';

const FB_EVENT_COMPLETE_INTRO_CONVERSATION = 'fb_complete_intro_conversation';
const FB_STOP_MSG_EVENT = 'fb_stop_messages_event';
const FB_QUICK_REPLY_RETRY_EVENT = 'fb_quick_reply_retry_event';

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
const DB_ARCHIVE_USER_LIST = 'archiveUserList';
const DB_CONVERSATIONS = 'conversations';
const DB_COLLECTION_LIST = 'collectionList';
// deprecated
const DB_COLLECTIONS = 'collections';
const DB_SERIES = 'series';
// deprecated
const DB_MESSAGES = 'messages';
const DB_MESSAGE_LIST = 'msglist';
const DB_USER_HISTORY = 'user-history';
const DB_BLOCKS = 'blocks';
const DB_MEDIA = 'media';
const DB_STUDY = 'study';

// Special actions
const ACTION_RETRY_QUICK_REPLY = 'ACTION_RETRY_QUICK_REPLY';
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
const TYPE_STOP_NOTIFICATIONS = 'stop-notifications';

const TYPE_BACK_TO_CONVERSATION = 'back-to-conversation';


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
const QUICK_REPLY_RETRY_ID_CONTINUE = `${QUICK_REPLY_RETRY_ID}-continue`;

const UPDATE_USER_MESSAGE = "Hi! Don't forget about me!";
// const SUPPORT_MESSAGE = "I can’t stop automatically but you can change your settings to turn me off like this:\n\nOn a phone: Click the settings gear in the top right corner. Then click “Manage Messages”. You can either turn off just notifications or all messages from me there.\n\nOn the computer: look for the “Options” panel to the right of our chat. Click either “Manage Messages” or “Notifications” from here to change your settings."

const RESET_USER_QUESTION = 'Are you sure you want to wipe your history from my memory?🤖';

const RESET_USER_RESPONSE_CONFIRM = {
  title: "Yes, wipe it clean",
  content_type: MESSAGE_TYPE_TEXT,
  payload: JSON.stringify({
    text: "Yes, wipe it clean",
    id: 'reset-user-confirm',
  }),
};

const RESET_USER_RESPONSE_CANCEL = {
  title: 'Nope, resume normal flow',
  content_type: MESSAGE_TYPE_TEXT,
  payload: JSON.stringify({
    id: `reset-user-reject`,
    text: 'Nope, resume normal flow'
  }),
};

const RESET_USER_KEY_RESPONSE = [RESET_USER_RESPONSE_CONFIRM, RESET_USER_RESPONSE_CANCEL];

const RESET_USER_CONFIRM = 'Your user information has been completely reset 🤖';
const RESET_USER_KEY_MESSAGE = '#oz8mu[M7h9C6rsrNza9';

const DB_ORDER_LIST = 'ordersList';
const QUICK_REPLY_BLOCK_ID = 'quick-reply-block-id';

const CRISIS_BLOCK_ID = 'crisis-parent-id';
const CRISIS_SEARCH_TERM_LIST = 'crisis-search-term-list';
const CRISIS_SEARCH_WORD_LIST = 'crisis-search-word-list';

const CRISIS_RESPONSE_MESSAGE_ID = 'crisis-response-message-id';


const STOP_SEARCH_TERM_LIST = 'stop-search-term-list';
const STOP_SEARCH_WORD_LIST = 'stop-search-word-list';
const STOP_MESSAGE_ID = 'stop-message-id';
const RESUME_MESSAGE_ID = 'resume-message-id';

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
const MINUTES_OF_INACTIVITY_BEFORE_UPDATE_MESSAGE = (24 * 60) - 15;
const CRONTAB_FOR_MESSAGE_UPDATE_CHECK = '*/3 * * * *';

const CRONTAB_FOR_STUDY_MESSAGE_UPDATE = '0 */2 * * *';

const CRONTAB_FOR_ARCHIVE_USERS_CHECK = '0 3 * * *'; // at 3 in the morning

const MAX_UPDATE_ACTIONS_ALLOWED = 20;

const NUMBER_OF_DAYS_WITH_NO_ACTIVITY_BEFORE_ARCHIVING = 30;

module.exports = {
  REST_PORT,
  FB_VERIFY_TOKEN,
  FB_PAGE_ACCESS_TOKEN,
  FB_TEXT_LIMIT,
  FB_GRAPH_ROOT_URL,
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
  END_OF_CONVERSATION_ID,
  QUICK_REPLY_RETRY_MESSAGE,
  QUICK_REPLY_RETRY_ID,
  UPDATE_USER_MESSAGE,
  CRISIS_RESPONSE_MESSAGE_ID,
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
  FB_APP_ID,
  FB_ACTIVITIES_URL,
  FB_GRAPH_TRUE_ROOT,
  FB_PAGE_ID,
  FB_EVENT_COMPLETE_INTRO_CONVERSATION,
  DB_COLLECTION_LIST,
  FB_STOP_MSG_EVENT,
  FB_QUICK_REPLY_RETRY_EVENT,
  STOP_SEARCH_TERM_LIST,
  STOP_SEARCH_WORD_LIST,
  STOP_MESSAGE_ID,
  DB_ORDER_LIST,
  QUICK_REPLY_BLOCK_ID,
  QUICK_REPLY_RETRY_ID_CONTINUE,
  TYPE_BACK_TO_CONVERSATION,
  CRISIS_SEARCH_TERM_LIST,
  CRISIS_SEARCH_WORD_LIST,
  RESUME_MESSAGE_ID,
  CRISIS_BLOCK_ID,
  CRONTAB_FOR_ARCHIVE_USERS_CHECK,
  NUMBER_OF_DAYS_WITH_NO_ACTIVITY_BEFORE_ARCHIVING,
  DB_ARCHIVE_USER_LIST,
};
