const REST_PORT = process.env.PORT || 5000;
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const FB_TEXT_LIMIT = 640;
const FB_GRAPH_ROOT_URL = 'https://graph.facebook.com/v2.6/';

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

// data types
const TYPE_COLLECTION = 'collection';
const TYPE_MESSAGE = 'message';
const TYPE_QUESTION = 'question';
const TYPE_QUESTION_WITH_REPLIES = 'questionWithReplies';
const TYPE_BLOCK = 'block';
const TYPE_IMAGE = 'image';
const TYPE_VIDEO = 'video';
const TYPE_ANSWER = 'answer';

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

module.exports = {
    REST_PORT,
    FB_VERIFY_TOKEN,
    FB_PAGE_ACCESS_TOKEN,
    FB_TEXT_LIMIT,
    FB_GRAPH_ROOT_URL,
    DB_USERS,
    DB_CONVERSATIONS,
    DB_COLLECTIONS,
    DB_SERIES,
    DB_MESSAGES,
    DB_BLOCKS,
    DB_MEDIA,
    DB_USER_HISTORY,
    TYPE_ANSWER,
    TYPE_COLLECTION,
    TYPE_MESSAGE,
    TYPE_QUESTION,
    TYPE_QUESTION_WITH_REPLIES,
    TYPE_BLOCK,
    TYPE_IMAGE,
    TYPE_VIDEO,
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
};
