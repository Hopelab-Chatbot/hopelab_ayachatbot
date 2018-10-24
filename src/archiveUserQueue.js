const Queue = require('bull');
const config = require('config');
const archiveUsers = require('./archiveUsers');
const { CRONTAB_FOR_ARCHIVE_USERS_CHECK } = require('./constants');
const { logger } = require('./logger');

function start() {
  const archiveUsersQueue = Queue(
    'archive users queue',
    {
      redis: {
        host: config.redis.host,
        port: config.redis.port
      }
    }
  );

  archiveUsersQueue.process(function(job, done) {
    logger.log('debug', "processing archive users queue");
    archiveUsers().then(() => {
      logger.log('debug', "Done processing archive users queue");
      done();
    })
      .catch(e => {
        logger.log('debug', `Archive users queue failed, ${JSON.stringify(e)}`);
        done();
      });
  });

  archiveUsersQueue.add({}, {
    repeat: {
      cron: CRONTAB_FOR_ARCHIVE_USERS_CHECK,
      tz: 'America/Los_Angeles',
    },
    removeOnComplete: true
  });
}

module.exports = { start };
