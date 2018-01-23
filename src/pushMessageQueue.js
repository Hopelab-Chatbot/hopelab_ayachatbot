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
    console.log("processing the push message queue", Date.now());
    updateUsers().then(() => {
      console.log("Done processing queue", Date.now());
      done();
    });
  });

  pushMessageQueue.add({}, {repeat: {cron: '*/20 * * * *'}})
}

module.exports = { start };
