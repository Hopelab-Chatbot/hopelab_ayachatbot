const R = require('ramda');

const { logger } = require('../logger');


const {
  FB_ERROR_CODE_UNAVAILABLE_USER,
  FB_ERROR_CODE_UNAVAILABLE_USER_10,
  FB_MESSAGING_TYPE_RESPONSE,
  TYPE_VIDEO,
  EXT_TO_TYPE
} = require('../constants');

const defaultErrorMsg = {
  message_type: FB_MESSAGING_TYPE_RESPONSE,
  message: {
    text: `Beep Boop! Some wires are crossed in my head.
 Try to continue in the conversation in a different track if possible. My human makers are checking it out.`,
  }
};

function isReturningBadFBCode(response) {
  const { statusCode, fbCode, fbErrorSubcode, err: { fbCode: errFBCode } = {} } = response;
  return (R.intersection([statusCode,fbCode,fbErrorSubcode, errFBCode],
    [FB_ERROR_CODE_UNAVAILABLE_USER, FB_ERROR_CODE_UNAVAILABLE_USER_10]).length > 0);
}

const createDefaultErrorMessage = ({ recipient }) => (
  {
    recipient,
    ...defaultErrorMsg
  }
);

const determineTypeByExtension = ext => EXT_TO_TYPE[ext] || TYPE_VIDEO;

const asText = val => val && R.equals(typeof val, 'string') && val.length;

const sanitizeQuickReplies = quickReplies =>
  Array.isArray(quickReplies) ?
    // check that there is a text, title, content_type === 'text', and payload
    quickReplies
      .filter(({ title, content_type, payload }) =>
        asText(title) && asText(payload) && content_type && R.equals(content_type, 'text'))
    : [];

const logErrorAboutMessage = (msg, additionalInfo) => logger.log('error',
  `badly structured messageData. Sending retry message; ${additionalInfo}; Message: ${JSON.stringify(msg)}`);

const sanitizeFBJSON = messageData => {
  let sanitizedData = messageData;
  const { message, recipient, messaging_type = FB_MESSAGING_TYPE_RESPONSE, sender_action } = messageData;
  if (message && recipient) {
    // valid path
    const { text, attachment, quick_replies } = message;
    // make sure we keep the messaging_type
    sanitizedData.message_type = messaging_type;
    if (!text && !attachment) {
      // we got closer, but still not a valid message
      logErrorAboutMessage(messageData);

      sanitizedData = createDefaultErrorMessage(messageData);
    } else {
      if (attachment) {
        const { type, payload } = attachment;
        if (payload) {
          const { url, attachment_id } = payload;
          if (!url && !attachment_id) {
            logErrorAboutMessage(messageData, 'no url in attachment object');
            sanitizedData = createDefaultErrorMessage(messageData);
          } else {
            // if url, but no type given, assign a type based on the extension
            if (!type) {
              sanitizedData.message.attachment.type = determineTypeByExtension(R.last(url.split('.')));
            }
          }
        } else {
          // no image... should we use a default image?
          logErrorAboutMessage(messageData, 'no image in attachment object');
          sanitizedData = createDefaultErrorMessage(messageData);
        }
      } else {
        //then we should have text
        if (!asText(text)) {
          // and text should be a string
          logErrorAboutMessage(messageData);
          sanitizedData = createDefaultErrorMessage(messageData);
        }
        // now we need to strip out invalid quick_replies
        if (quick_replies) {
          const newQRs = sanitizeQuickReplies(quick_replies);
          if (newQRs && newQRs.length) {
            // only send quick_reply array if valid quick_replies exist
            sanitizedData.message.quick_replies = newQRs;
          }
        }
      }
    }
  } else if (!sender_action) {
    // uh oh, we got a problem
    logErrorAboutMessage(messageData);
    if (!message) {
      // send generic message to try to reset track
      sanitizedData = createDefaultErrorMessage(messageData);
    }
    // if !recipient, then it doesn't matter what we send
  }
  return sanitizedData;
};

module.exports = {
  isReturningBadFBCode,
  sanitizeFBJSON
};
