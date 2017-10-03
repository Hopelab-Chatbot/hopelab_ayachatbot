const redis = require('redis');
const redisClient = redis.createClient();
const cacheUtils = require('alien-node-redis-utils')(redisClient);

const series = require('../stubs/series.json');
const messages = require('../stubs/messages.json');
const blocks = require('../stubs/blocks.json');
const {
    DB_USERS,
    DB_SERIES,
    DB_MESSAGES,
    DB_BLOCKS,
    DB_USER_HISTORY
} = require('./constants');

const time = 1000 * 60 * 60 * 24 * 7 * 4;

cacheUtils.deleteItem(DB_USERS).then(() => {
    cacheUtils.setItem(DB_USERS, time, []).then(process.exit);
});

cacheUtils.deleteItem(DB_SERIES).then(() => {
    cacheUtils.setItem(DB_SERIES, time, series).then(process.exit);
});

cacheUtils.deleteItem(DB_MESSAGES).then(() => {
    cacheUtils.setItem(DB_MESSAGES, time, messages).then(process.exit);
});

cacheUtils.deleteItem(DB_BLOCKS).then(() => {
    cacheUtils.setItem(DB_BLOCKS, time, blocks).then(process.exit);
});

cacheUtils.deleteItem(DB_USER_HISTORY).then(() => {
    cacheUtils.setItem(DB_USER_HISTORY, time, []).then(process.exit);
});
