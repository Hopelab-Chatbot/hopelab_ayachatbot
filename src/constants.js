const REST_PORT = process.env.PORT || 5000;
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const FB_TEXT_LIMIT = 640;
const FB_GRAPH_ROOT_URL = 'https://graph.facebook.com/v2.6/';

// facebook messenger
const TYPING_TIME_IN_MILLISECONDS = 1000 * 1;

// database keys
const DB_USERS = 'users';
const DB_SERIES = 'series';
const DB_MESSAGES = 'messages';
const DB_USER_HISTORY = 'user-history';
const DB_BLOCKS = 'blocks';
const DB_MEDIA = 'media';

// data types
const TYPE_MESSAGE = 'message';
const TYPE_QUESTION = 'question';
const TYPE_BLOCK = 'block';
const TYPE_IMAGE = 'image';
const TYPE_VIDEO = 'video';

// caching time
const ONE_DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24;
const ONE_WEEK_IN_MILLISECONDS = 1000 * 60 * 60 * 24 * 7 * 4;

module.exports = {
    REST_PORT,
    FB_VERIFY_TOKEN,
    FB_PAGE_ACCESS_TOKEN,
    FB_TEXT_LIMIT,
    FB_GRAPH_ROOT_URL,
    DB_USERS,
    DB_SERIES,
    DB_MESSAGES,
    DB_BLOCKS,
    DB_MEDIA,
    DB_USER_HISTORY,
    TYPE_MESSAGE,
    TYPE_QUESTION,
    TYPE_BLOCK,
    TYPE_IMAGE,
    TYPE_VIDEO,
    ONE_DAY_IN_MILLISECONDS,
    ONE_WEEK_IN_MILLISECONDS,
    TYPING_TIME_IN_MILLISECONDS
};
