const Queue = require('bull');
const config = require('config');
const studyMessageUpdate = require('./studyMessageUpdate');
const { CRONTAB_FOR_STUDY_MESSAGE_UPDATE } = require('./constants');
const { logger } = require('./logger');

function start() {
  const studyMessageQueue = Queue(
    'study message queue',
    {
      redis: {
        host: config.redis.host,
        port: config.redis.port
      }
    }
  );

  studyMessageQueue.process(function(job, done) {
    console.log("processing the study message queue", Date.now());
    studyMessageUpdate().then(() => {
      console.log("Done processing study message queue", Date.now());
      done();
    })
    .catch(e => {
      console.log(`Study message update failed, ${JSON.stringify(e)}`, Date.now());
      logger.log('error', `Study message update failed, ${JSON.stringify(e)}`);
      done();
    });
  });

  studyMessageQueue.add({}, {
    repeat: {cron: CRONTAB_FOR_STUDY_MESSAGE_UPDATE },
    removeOnComplete: true
  });
}

module.exports = { start };
