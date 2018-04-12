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
    console.log("processing the push message queue", Date.now());
    updateUsers().then(() => {
      console.log("Done processing queue", Date.now());
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
