const redis = require('redis');
const config = require('config');
const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port
});

redisClient.on("error", function (err) {
  console.log("Error " + err); //eslint-disable-line no-console
});

const cacheUtils = require('alien-node-redis-utils')(redisClient);

const {promisify} = require('util');
const getAsync = promisify(redisClient.get).bind(redisClient);
const getLAsync = promisify(redisClient.lrange).bind(redisClient);

const {
  DB_USERS,
  DB_USER_LIST,
  DB_CONVERSATIONS,
  DB_COLLECTIONS,
  DB_SERIES,
  DB_MESSAGES,
  DB_BLOCKS,
  DB_MEDIA,
  DB_STUDY,
  ONE_DAY_IN_MILLISECONDS,
  EXPIRE_USER_AFTER
} = require('./constants');

const { createNewUser } = require('./users');

const getJSONItemFromCache = key =>
  getAsync(key)
    .then(item => item ? JSON.parse(item) : null)
    .catch(null);

const keyFormatUserId = id => `user:${id}`;

/**
 * Set User in Cache
 *
 * @param {Object} user
*/
const setUserInCache = user => {
  cacheUtils.setItem(
    keyFormatUserId(user.id),
    // expires user in ONE month (default) if no changes are made to it
    EXPIRE_USER_AFTER,
    user
  ).catch(e => (
    console.error(
      `error: setStudyInfo - cacheUtils.setItem(user:${user.id})`,
      e
    )
  ));
};
// NOTE: this is used in testing. DO NOT DELETE
const removeUserFromCache = user => { // eslint-disable-line no-unused-vars
  cacheUtils.deleteItem(
    keyFormatUserId(user.id)
  ).catch(e => (
    console.error(
      `error: setStudyInfo - cacheUtils.deleteIrem(user:${user.id})`,
      e
    )
  ));
};


/**
 * Update User By ID
 *
 * @param {Object} user
 * @return {Promise}
*/
const updateUser = user =>
  new Promise(resolve =>
    resolve(setUserInCache(user))
  );

const updateAllUsers = (usersToUpdate = []) =>
  new Promise(resolve => {
    resolve(usersToUpdate.forEach(user => setUserInCache(user)));
  });

/**
 * Create a User in Database
 *
 * @param {Object} { id, user }
*/
function returnNewOrOldUser({ id, user }) {
  if (!user && id) {
    const newUser = createNewUser(id);
    // remove the id if it exists for some reason already
    redisClient.lrem(DB_USER_LIST, 1, id);
    // add the id to the user list array
    redisClient.lpush(DB_USER_LIST, id);
    setUserInCache(newUser);
    return Promise.resolve(newUser);
  } else {
    return Promise.resolve(user);
  }
}

/**
 * Get User By ID
 *
 * @param {String} id
 * @return {Promise<Object>}
*/
const getUserById = id =>
  new Promise(resolve => {
    getJSONItemFromCache(keyFormatUserId(id))
      .then(user => resolve(returnNewOrOldUser({ id, user})))
      .catch(e => {
        // no item found matching cacheKey
        console.error(
          `error: getUserById - getJSONItemFromCache(user:${id}})`,
          e
        );
      });
  });


const getUsers = () =>
  new Promise(resolve => {
    getLAsync(DB_USER_LIST, 0, -1)
      .then(userIds =>
        resolve(Promise.all(
          userIds.map(id => getUserById(id)))
        )
      )
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
            });
        } else {
          console.error(
            `error: getStudyInfo - cacheUtils.getItem(${DB_STUDY})`,
            e
          );
        }
      });
  });

const setStudyInfo = studyInfo =>
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
  updateUser,
  updateAllUsers,
  keyFormatUserId,
  setUserInCache
};
