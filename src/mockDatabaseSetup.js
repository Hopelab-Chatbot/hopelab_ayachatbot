const redis = require('redis');
const redisClient = redis.createClient();
const cacheUtils = require('alien-node-redis-utils')(redisClient);

const conversations = require('../stubs/conversation.json');
const collections = require('../stubs/collection.json');
const series = require('../stubs/series.json');
const messages = require('../stubs/messages.json');
const blocks = require('../stubs/blocks.json');
const media = require('../stubs/media.json');
const {
    DB_USERS,
    DB_CONVERSATIONS,
    DB_COLLECTIONS,
    DB_SERIES,
    DB_MESSAGES,
    DB_BLOCKS,
    DB_USER_HISTORY,
    DB_MEDIA,
    ONE_WEEK_IN_MILLISECONDS
} = require('./constants');

cacheUtils.deleteItem(DB_USERS).then(() => {
    cacheUtils
        .setItem(DB_USERS, ONE_WEEK_IN_MILLISECONDS, [])
        .then(process.exit);
});

cacheUtils.deleteItem(DB_CONVERSATIONS).then(() => {
    cacheUtils
        .setItem(DB_CONVERSATIONS, ONE_WEEK_IN_MILLISECONDS, conversations)
        .then(process.exit);
});

cacheUtils.deleteItem(DB_COLLECTIONS).then(() => {
    cacheUtils
        .setItem(DB_COLLECTIONS, ONE_WEEK_IN_MILLISECONDS, collections)
        .then(process.exit);
});

cacheUtils.deleteItem(DB_SERIES).then(() => {
    cacheUtils
        .setItem(DB_SERIES, ONE_WEEK_IN_MILLISECONDS, series)
        .then(process.exit);
});

cacheUtils.deleteItem(DB_MESSAGES).then(() => {
    cacheUtils
        .setItem(DB_MESSAGES, ONE_WEEK_IN_MILLISECONDS, messages)
        .then(process.exit);
});

cacheUtils.deleteItem(DB_BLOCKS).then(() => {
    cacheUtils
        .setItem(DB_BLOCKS, ONE_WEEK_IN_MILLISECONDS, blocks)
        .then(process.exit);
});

cacheUtils.deleteItem(DB_MEDIA).then(() => {
    cacheUtils
        .setItem(DB_MEDIA, ONE_WEEK_IN_MILLISECONDS, media)
        .then(process.exit);
});

cacheUtils.deleteItem(DB_USER_HISTORY).then(() => {
    cacheUtils
        .setItem(DB_USER_HISTORY, ONE_WEEK_IN_MILLISECONDS, [])
        .then(process.exit);
});
