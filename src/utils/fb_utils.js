const R = require('ramda');
const {
  FB_ERROR_CODE_UNAVAILABLE_USER,
  FB_ERROR_CODE_UNAVAILABLE_USER_10,
} = require('../constants');

function isReturningBadFBCode(response) {
  const { statusCode, fbCode, fbErrorSubcode, err: { fbCode: errFBCode } = {} } = response;
  return (R.intersection([statusCode,fbCode,fbErrorSubcode, errFBCode],
    [FB_ERROR_CODE_UNAVAILABLE_USER, FB_ERROR_CODE_UNAVAILABLE_USER_10]).length > 0);
}

module.exports = {
  isReturningBadFBCode,
};
