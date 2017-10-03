const REST_PORT = process.env.PORT || 5000;
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const FB_TEXT_LIMIT = 640;
const FB_GRAPH_ROOT_URL = 'https://graph.facebook.com/v2.6/';

// database keys
const DB_USERS = 'users';
const DB_MODULES = 'modules';
const DB_MESSAGES = 'messages';
const DB_USER_HISTORY = 'user-history';
const DB_BLOCKS = 'blocks';

module.exports = {
    REST_PORT,
    FB_VERIFY_TOKEN,
    FB_PAGE_ACCESS_TOKEN,
    FB_TEXT_LIMIT,
    FB_GRAPH_ROOT_URL,
    DB_USERS,
    DB_MODULES,
    DB_MESSAGES,
    DB_BLOCKS,
    DB_USER_HISTORY
};
