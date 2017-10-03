const redis = require('redis');
const redisClient = redis.createClient();
const cacheUtils = require('alien-node-redis-utils')(redisClient);
const {
    DB_USERS,
    DB_MODULES,
    DB_MESSAGES,
    DB_BLOCKS,
    DB_USER_HISTORY
} = require('./constants');

const { createNewUser } = require('./users');

const time = 1000 * 60 * 60 * 24;

// does the response have a unique identifier?
// otherwise, what module and action did we leave off at?

function updateUserById(id, user) {
    return new Promise((resolve, reject) => {

        cacheUtils.getItem(DB_USERS)
            .then((users) => {
                users = JSON.parse(users);

                return cacheUtils.setItem(DB_USERS, time, users.map(u => u.id === id ? user : u)).then(() => {
                    resolve();
                });
            })
            .catch((e) => {
                console.log('error: updateUserById', e);
                reject();
            });
    });
}

function getUserById(id) {
    return new Promise((resolve, reject) => {
        cacheUtils.getItem(DB_USERS)
            .then(function(users) {
                users = JSON.parse(users);

                let user = users.find(u => u.id === id);

                // if user not present, initialize
                // a new user reference in db
                if (!user) {
                    user = createNewUser(id);
                    const newUsers = users.concat(user);

                    return cacheUtils.setItem(DB_USERS, time, newUsers).then(() => {
                        resolve(user);
                    });
                }

                resolve(user);
            })
            .catch(function(e) {
                // no item found matching cacheKey 
                console.log('error: getUserById', e);
            });
    });
}

function getModules() {
    return new Promise((resolve, reject) => {
        cacheUtils.getItem(DB_MODULES)
            .then((modules) => {
                resolve(JSON.parse(modules));
            })
            .catch((e) => {
                console.log('error: getModules', e);
            });
    });
}

function getMessages() {
    return new Promise((resolve, reject) => {
        cacheUtils.getItem(DB_MESSAGES)
            .then((modules) => {
                resolve(JSON.parse(modules));
            })
            .catch((e) => {
                console.log('error: getMessages', e);
            });
    });
}

function getBlocks() {
    return new Promise((resolve, reject) => {
        cacheUtils.getItem(DB_BLOCKS)
            .then((modules) => {
                resolve(JSON.parse(modules));
            })
            .catch((e) => {
                console.log('error: getBlocks', e);
            });
    });
}

function getUserHistory() {
    return new Promise((resolve, reject) => {
        cacheUtils.getItem(DB_USER_HISTORY)
            .then((modules) => {
                resolve(JSON.parse(modules));
            })
            .catch((e) => {
                console.log('error: getUserHistory', e);
            });
    });
}

module.exports = {
    getUserById,
    getModules,
    getMessages,
    getBlocks,
    getUserHistory,
    updateUserById
};