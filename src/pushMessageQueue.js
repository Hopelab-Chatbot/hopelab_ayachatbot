const Queue = require('bull');
const config = require('config');
const updateUsers = require('./updateUsers');
const { CRONTAB_FOR_MESSAGE_UPDATE_CHECK } = require('./constants');
const { logger } = require('./logger');

function start() {
  const pushMessageQueue = Queue(
    'push message queue',
    {
      redis: {
        host: config.redis.host,
        port: config.redis.port
      }
    }
  );

  pushMessageQueue.process(function(job, done) {
    logger.log('debug', "processing the push message queue", Date.now());
    logger.log('debug', `processing the push message queue!!`);
    updateUsers().then(() => {
      logger.log('debug', "Done processing queue", Date.now());
      logger.log('debug', 'Done processing push message queue');
      done();
    })
      .catch(e => {
        logger.log('error', `Push message update failed, ${JSON.stringify(e)}`);
        done();
      });
  });

  pushMessageQueue.add({}, {
    repeat: {cron: CRONTAB_FOR_MESSAGE_UPDATE_CHECK},
    removeOnComplete: true
  });
}

module.exports = { start };
