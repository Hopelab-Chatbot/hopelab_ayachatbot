const Queue = require('bull');
const config = require('config');
const updateUsers = require('./updateUsers');

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
    console.warn('working on job');
    updateUsers().then((data) => {
      console.warn("Job complete");
      done();
    });
  });

  pushMessageQueue.add({}, {repeat: {cron: '* * * * *'}})
}

module.exports = { start };
