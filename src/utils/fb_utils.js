const R = require('ramda');

const { logger } = require('../logger');


const {
  FB_ERROR_CODE_UNAVAILABLE_USER,
  FB_ERROR_CODE_UNAVAILABLE_USER_10,
  FB_MESSAGING_TYPE_RESPONSE,
  TYPE_VIDEO,
  EXT_TO_TYPE,
  FB_MESSAGING_TYPE_UPDATE,
  TYPE_IMAGE,
  MESSAGE_TYPE_TEXT
} = require('../constants');

const defaultErrorMsg = {
  messaging_type: FB_MESSAGING_TYPE_RESPONSE,
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

const validateMessagingType = type => R.defaultTo(FB_MESSAGING_TYPE_RESPONSE,
  [FB_MESSAGING_TYPE_RESPONSE, FB_MESSAGING_TYPE_UPDATE].find(R.equals(type)));

const determineTypeByExtension = ext => EXT_TO_TYPE[ext] || TYPE_VIDEO;

const asText = val => val && R.equals(typeof val, 'string') && val.length;

const sanitizeQuickReplies = quickReplies =>
  Array.isArray(quickReplies) ?
    // check that there is a text, title, content_type === 'text', and payload
    quickReplies
      .filter(({ title, content_type, payload }) =>
        asText(title) && asText(payload) && content_type && R.equals(content_type, MESSAGE_TYPE_TEXT))
    : [];

const logErrorAboutMessage = (msg, additionalInfo) => logger.log('error',
  `badly structured messageData. Sending retry message; ${additionalInfo}; Message: ${JSON.stringify(msg)}`);

const sanitizeFBJSON = messageData => {
  let sanitizedData = messageData;
  const { message, recipient, messaging_type = FB_MESSAGING_TYPE_RESPONSE, sender_action } = messageData;
  // make sure we keep the messaging_type, if it is correct
  sanitizedData.messaging_type = validateMessagingType(messaging_type);
  if (message && recipient) {
    // valid path
    const { text, attachment, quick_replies } = message;
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
              if (url) {
                sanitizedData.message.attachment.type = determineTypeByExtension(R.last(url.split('.')));
              } else if (attachment_id){
                // if attachment_id exists, it is most likely a video
                sanitizedData.message.attachment.type = TYPE_VIDEO;
              } else {
                //otherwise it is probably an img
                sanitizedData.message.attachment.type = TYPE_IMAGE;
              }
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
          } else {
            // empty quick_replies array is not allowed
            delete sanitizedData.message.quick_replies;
          }
        }
      }
    }
  } else if (!sender_action && !message) {
    // if !recipient, then it doesn't matter what we send
    logErrorAboutMessage(messageData);
    sanitizedData = createDefaultErrorMessage(messageData);
  }
  return sanitizedData;
};

module.exports = {
  isReturningBadFBCode,
  sanitizeFBJSON
};
