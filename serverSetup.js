const redis = require('redis');
const redisClient = redis.createClient();
const cacheUtils = require('alien-node-redis-utils')(redisClient);

const modules = require('./stubs/modules.json');
const messages = require('./stubs/messages.json');
const blocks = require('./stubs/blocks.json');
const {
    DB_USERS,
    DB_MODULES,
    DB_MESSAGES,
    DB_BLOCKS,
    DB_USER_HISTORY
} = require('./constants');

const time = 1000 * 60 * 60 * 24 * 7 * 4;

cacheUtils.deleteItem(DB_USERS).then(() => {
    cacheUtils.setItem(DB_USERS, time, [])
        .then(process.exit)
});

cacheUtils.deleteItem(DB_MODULES).then(() => {
    cacheUtils.setItem(DB_MODULES, time, modules)
        .then(process.exit)
});

cacheUtils.deleteItem(DB_MESSAGES).then(() => {
    cacheUtils.setItem(DB_MESSAGES, time, messages)
        .then(process.exit)
});

cacheUtils.deleteItem(DB_BLOCKS).then(() => {
    cacheUtils.setItem(DB_BLOCKS, time, blocks)
        .then(process.exit)
});

cacheUtils.deleteItem(DB_USER_HISTORY).then(() => {
    cacheUtils.setItem(DB_USER_HISTORY, time, [])
        .then(process.exit)
});