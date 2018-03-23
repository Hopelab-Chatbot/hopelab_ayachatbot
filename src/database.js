const redis = require('redis');
const config = require('config');
const redisClient = redis.createClient({
    host: config.redis.host,
    port: config.redis.port
});
const cacheUtils = require('alien-node-redis-utils')(redisClient);

const {
    DB_USERS,
    DB_CONVERSATIONS,
    DB_COLLECTIONS,
    DB_SERIES,
    DB_MESSAGES,
    DB_BLOCKS,
    DB_MEDIA,
    DB_STUDY,
    DB_USER_HISTORY,
    ONE_DAY_IN_MILLISECONDS
} = require('./constants');

const { createNewUser } = require('./users');

/**
 * Set User in Cache
 *
 * @param {Object} user
 * @return {Promise}
*/
const setUserInCache = user => users =>
    cacheUtils.setItem(
        DB_USERS,
        ONE_DAY_IN_MILLISECONDS,
        users.map(u => (u.id === user.id ? user : u))
    );

/**
 * Update User By ID
 *
 * @param {Object} user
 * @return {Promise}
*/
const updateUser = user =>
    new Promise(resolve => {
        cacheUtils
            .getItem(DB_USERS)
            .then(JSON.parse)
            .then(setUserInCache(user))
            .then(resolve)
            .catch(e => {
                console.error(
                    `error: updateUser - cacheUtils.getItem(${DB_USERS})`,
                    e
                );
                reject();
            });
    });

/**
 * Find User By Id
 *
 * @param {String} id
 * @return {Object}
*/
const findUserById = id => users => ({
    id,
    user: users.find(u => u.id === id),
    users
});

/**
 * Create a User in Database
 *
 * @param {Object} { id, user, users }
 * @return {Promise<Object>}
*/
function createUserIfNotExisting({ id, user, users }) {
    if (!user) {
        user = createNewUser(id);
        const newUsers = users.concat(user);

        return cacheUtils
            .setItem(DB_USERS, ONE_DAY_IN_MILLISECONDS, newUsers)
            .then(() => user)
            .catch(e =>
                console.error(
                    `error: getUserById - cacheUtils.setItem(${DB_USERS})`,
                    e
                )
            );
    }

    return Promise.resolve(user);
}

/**
 * Get User By ID
 *
 * @param {String} id
 * @return {Promise<Object>}
*/
const getUserById = id =>
    new Promise(resolve => {
        cacheUtils
            .getItem(DB_USERS)
            .then(JSON.parse)
            .then(findUserById(id))
            .then(createUserIfNotExisting)
            .then(resolve)
            .catch(e => {
                // no item found matching cacheKey
                console.error(
                    `error: getUserById - cacheUtils.getItem(${DB_USERS})`,
                    e
                );
            });
    });


const getUsers = () =>
    new Promise(resolve => {
      cacheUtils
          .getItem(DB_USERS)
          .then(JSON.parse)
          .then(resolve)
          .catch(e => {
              // no item found matching cacheKey
              console.error(
                  `error: getUsers - cacheUtils.getItem(${DB_USERS})`,
                  e
              );
          });
    });

/**
 * Get Conversations
 *
 * @return {Promise<Array>}
*/
const getConversations = () =>
    new Promise(resolve => {
        cacheUtils
            .getItem(DB_CONVERSATIONS)
            .then(JSON.parse)
            .then(resolve)
            .catch(e => {
                console.error(
                    `error: getConversations - cacheUtils.getItem(${DB_CONVERSATIONS})`,
                    e
                );
            });
    });

/**
 * Get Collections
 *
 * @return {Promise<Array>}
*/
const getCollections = () =>
    new Promise(resolve => {
        cacheUtils
            .getItem(DB_COLLECTIONS)
            .then(JSON.parse)
            .then(resolve)
            .catch(e => {
                console.error(
                    `error: getCollections - cacheUtils.getItem(${DB_COLLECTIONS})`,
                    e
                );
            });
    });

/**
 * Get Series
 *
 * @return {Promise<Array>}
*/
const getSeries = () =>
    new Promise(resolve => {
        cacheUtils
            .getItem(DB_SERIES)
            .then(JSON.parse)
            .then(resolve)
            .catch(e => {
                console.error(
                    `error: getSeries - cacheUtils.getItem(${DB_SERIES})`,
                    e
                );
            });
    });

/**
 * Get Messages
 *
 * @return {Promise<Array>}
*/
const getMessages = () =>
    new Promise(resolve => {
        cacheUtils
            .getItem(DB_MESSAGES)
            .then(JSON.parse)
            .then(resolve)
            .catch(e => {
                console.error('error: getMessages', e);
            });
    });

/**
 * Get Blocks
 *
 * @return {Promise<Array>}
*/
const getBlocks = () =>
    new Promise(resolve => {
        cacheUtils
            .getItem(DB_BLOCKS)
            .then(JSON.parse)
            .then(resolve)
            .catch(e => {
                console.error(
                    `error: getBlocks - cacheUtils.getItem(${DB_BLOCKS})`,
                    e
                );
            });
    });

/**
 * Get Media
 *
 * @return {Promise<Object>}
*/
const getMedia = () =>
    new Promise(resolve => {
        cacheUtils
            .getItem(DB_MEDIA)
            .then(JSON.parse)
            .then(resolve)
            .catch(e => {
                console.error(
                    `error: getMedia - cacheUtils.getItem(${DB_MEDIA})`,
                    e
                );
            });
    });

const getStudyInfo = () =>
  new Promise(resolve => {
      cacheUtils
          .getItem(DB_STUDY)
          .then(JSON.parse)
          .then(d => {
            return d;
          })
          .then(resolve)
          .catch(e => {
              if (e === undefined) {
                cacheUtils
                  .setItem(DB_STUDY, ONE_DAY_IN_MILLISECONDS, [])
                  .then(() => resolve([]))
                  .catch(e => {
                    console.error(
                        `error: getStudyInfo - cacheUtils.getItem(${DB_STUDY})`,
                        e
                    );
                  })
              } else {
                console.error(
                    `error: getStudyInfo - cacheUtils.getItem(${DB_STUDY})`,
                    e
                );
              }
          });
  });

const setStudyInfo = (studyInfo) =>
  cacheUtils.setItem(
      DB_STUDY,
      ONE_DAY_IN_MILLISECONDS,
      studyInfo
  ).catch(e => (
    console.error(
      `error: setStudyInfo - cacheUtils.setItem(${DB_STUDY})`,
      e
    )
  ));


module.exports = {
    getUserById,
    getUsers,
    getConversations,
    getCollections,
    getSeries,
    getMessages,
    getBlocks,
    getMedia,
    getStudyInfo,
    setStudyInfo,
    updateUser
};
