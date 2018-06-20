const winston = require('winston');
const { combine, timestamp, simple } = winston.format;

let level = 'debug';

if (process.env.NODE_ENV !== 'production') {
  level = 'debug';
}

const logger = winston.createLogger({
  level,
  format: combine(
    timestamp(),
    simple()

  ),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new winston.transports.File({ filename: 'error.log', level: 'error', 'timestamp': true}),
    new winston.transports.File({ level, filename: 'combined.log', timestamp: true })
  ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//

// Un comment to see logs in the console
// if (process.env.NODE_ENV !== 'production') {
//   logger.add(new winston.transports.Console({
//     format: simple(),
//     level
//   }));
// }

module.exports = {
  logger
};
