const {
  getUsers,
  archiveUser
} = require('./database');
const moment = require('moment');
const { shouldArchiveUser } = require('./utils/user_utils');

const { logger } = require('./logger');

module.exports = () => {
  const promise = getUsers();
  logger.log('debug', 'About to execute promise for all redis data, push messages');
  const now = moment();
  return Promise.resolve(promise).then(users => {
    const archiveUserPromises = [];
    let num = 0;
    users.forEach(user => {
      if (shouldArchiveUser(user, now)) {
        archiveUserPromises.push(archiveUser(user));
        num++;
      }
    });
    Promise.all(archiveUserPromises).then(() =>{
      logger.log('debug', `Finished archiving ${num} users`);
    });
  });
};
