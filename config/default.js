'use strict';

const R = require('ramda');
// These values can be overridden by either environment vars or by a NODE_ENV named config
// which declares the desired object of the same name.
const FALLBACK_DEFAULT_VALUES = {
  redis: {
    host: '127.0.0.1',
    port: 6379
  },
  chat_api: {
      endpoint: 'https://graph.facebook.com/',
      version: 'v2.6'
   }
};

const config = {
  redis: {
    host: R.defaultTo(
      R.path(['redis', 'host'], FALLBACK_DEFAULT_VALUES),
      R.path(['env', 'REDIS_HOST'], process)
    ),
    port: R.defaultTo(
      R.path(['redis', 'port'], FALLBACK_DEFAULT_VALUES),
      R.path(['env', 'REDIS_PORT'], process)
    )
  },
  chatApi: {
    endpoint: R.defaultTo(
      R.path(['chat_api', 'endpoint'], FALLBACK_DEFAULT_VALUES),
      R.path(['env', 'CHAT_API_ENDPOINT'], process)
    ),
    version: R.defaultTo(
      R.path(['chat_api', 'versioj'], FALLBACK_DEFAULT_VALUES),
      R.path(['env', 'CHAT_API_VERSION'], process)
    )
  }
};

module.exports = config;
