const redis = require('redis');
const redisClient = redis.createClient();
const cacheUtils = require('alien-node-redis-utils')(redisClient);
const {
    DB_USERS,
    DB_SERIES,
    DB_MESSAGES,
    DB_BLOCKS,
    DB_USER_HISTORY
} = require('./constants');

const { createNewUser } = require('./users');

const time = 1000 * 60 * 60 * 24;

/**
 * Update User By ID
 * 
 * @param {Object} user
 * @return {Promise}
*/
function updateUser(user) {
    return new Promise((resolve, reject) => {
        cacheUtils
            .getItem(DB_USERS)
            .then(users => {
                users = JSON.parse(users);

                return cacheUtils
                    .setItem(
                        DB_USERS,
                        time,
                        users.map(u => (u.id === user.id ? user : u))
                    )
                    .then(() => {
                        resolve();
                    });
            })
            .catch(e => {
                console.log('error: updateUser', e);
                reject();
            });
    });
}

/**
 * Get User By ID
 * 
 * @param {String} id
 * @return {Promise<Object>}
*/
function getUserById(id) {
    return new Promise((resolve, reject) => {
        cacheUtils
            .getItem(DB_USERS)
            .then(function(users) {
                users = JSON.parse(users);

                let user = users.find(u => u.id === id);

                if (!user) {
                    user = createNewUser(id);
                    const newUsers = users.concat(user);

                    return cacheUtils
                        .setItem(DB_USERS, time, newUsers)
                        .then(() => {
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

/**
 * Get Series
 * 
 * @return {Promise<Array>}
*/
function getSeries() {
    return new Promise((resolve, reject) => {
        cacheUtils
            .getItem(DB_SERIES)
            .then(series => {
                resolve(JSON.parse(series));
            })
            .catch(e => {
                console.log('error: getSeries', e);
            });
    });
}

/**
 * Get Messages
 * 
 * @return {Promise<Array>}
*/
function getMessages() {
    return new Promise((resolve, reject) => {
        cacheUtils
            .getItem(DB_MESSAGES)
            .then(messages => {
                resolve(JSON.parse(messages));
            })
            .catch(e => {
                console.log('error: getMessages', e);
            });
    });
}

/**
 * Get Blocks
 * 
 * @return {Promise<Array>}
*/
function getBlocks() {
    return new Promise((resolve, reject) => {
        cacheUtils
            .getItem(DB_BLOCKS)
            .then(blocks => {
                resolve(JSON.parse(blocks));
            })
            .catch(e => {
                console.log('error: getBlocks', e);
            });
    });
}

/**
 * Get user History
 * 
 * @return {Promise<Array>}
*/
function getUserHistory() {
    return new Promise((resolve, reject) => {
        cacheUtils
            .getItem(DB_USER_HISTORY)
            .then(history => {
                resolve(JSON.parse(history));
            })
            .catch(e => {
                console.log('error: getUserHistory', e);
            });
    });
}

module.exports = {
    getUserById,
    getSeries,
    getMessages,
    getBlocks,
    getUserHistory,
    updateUser
};
