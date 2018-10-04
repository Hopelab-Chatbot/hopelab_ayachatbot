const winston = require('winston');
const { combine, timestamp, simple } = winston.format;
require('winston-daily-rotate-file');

let level = 'info';

if (process.env.NODE_ENV !== 'production') {
  level = 'info';
} else {
  level = 'error';
}

const transport = new (winston.transports.DailyRotateFile)({
  filename: `./logs/${level}-%DATE%.log`,
  datePattern: 'YYYY-MM-DD-HH',
  maxSize: '10m',
  maxFiles: '7d'
});

const logger = winston.createLogger({
  level,
  format: combine(
    timestamp(),
    simple()
  ),
  timestamp: true,
  transports: [
    transport
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
