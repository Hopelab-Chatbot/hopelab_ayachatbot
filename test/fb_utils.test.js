const expect = require('chai').expect;
const rewire = require('rewire');


const {
  FB_TYPING_ON_TYPE,
  FB_MESSAGING_TYPE_RESPONSE,
  TYPE_IMAGE,
  TYPE_VIDEO,
  MESSAGE_TYPE_TEXT,
} = require('../src/constants');
const testModule = rewire('../src/utils/fb_utils');
testModule.defaultErrorMsg = testModule.__get__('defaultErrorMsg');
testModule.createDefaultErrorMessage = testModule.__get__('createDefaultErrorMessage');

const { sanitizeFBJSON, createDefaultErrorMessage } = testModule;

describe('fb utils helper', () => {
  describe('sanitizeFBJSON', () => {
    it('should always return a valid message', () => {
      let badMsg = 'nonsense';
      expect(sanitizeFBJSON(badMsg)).to.deep.equal(createDefaultErrorMessage(badMsg));
      badMsg = 123;
      expect(sanitizeFBJSON(badMsg)).to.deep.equal(createDefaultErrorMessage(badMsg));
      badMsg = {recipient: {}, badMsg};
      expect(sanitizeFBJSON(badMsg)).to.deep.equal(createDefaultErrorMessage(badMsg));
      badMsg = {recipient: {id: '213'}, message: 'still will not work'};
      expect(sanitizeFBJSON(badMsg)).to.deep.equal(createDefaultErrorMessage(badMsg));
      badMsg = {
        attachment: {
          text: 'foobar'
        },
        recipient: {
          id: '123',
        },
        messaging_type: 'foo-bar',
      };
      expect(sanitizeFBJSON(badMsg)).to.deep.equal(createDefaultErrorMessage(badMsg));
    });

    it('should return the input text message, plus missing default values, when formatted correctly', () => {
      // plain message w/o message_type
      let goodMessage = {
        message: {
          text: 'foo bar'
        },
        recipient: {
          id: '123',
        }
      };
      expect(sanitizeFBJSON({...goodMessage})).to.deep.equal({
        ...goodMessage,
        messaging_type: FB_MESSAGING_TYPE_RESPONSE
      });

      // plain typing response w/o message_type
      goodMessage = {
        sender_action: FB_TYPING_ON_TYPE,
        recipient: {
          id: '123',
        }
      };
      expect(sanitizeFBJSON({...goodMessage})).to.deep.equal({
        ...goodMessage,
        messaging_type: FB_MESSAGING_TYPE_RESPONSE
      });

      // plain message with bad message_type
      goodMessage = {
        message: {
          text: 'foobar'
        },
        recipient: {
          id: '123',
        },
        messaging_type: 'foo-bar',
      };
      expect(sanitizeFBJSON({...goodMessage})).to.deep.equal({
        ...goodMessage,
        messaging_type: FB_MESSAGING_TYPE_RESPONSE
      });

    });

    it('should return the input attachment message, .... when formatted correctly', () => {
      // if attachment_id is used, it is likely a video, and that should be returned
      let goodMessage = {
        message: {
          attachment: {
            payload: {
              attachment_id: 'foobar'
            }
          },
        },
        recipient: {
          id: '123',
        },
        messaging_type: 'foo-bar',
      };
      expect(sanitizeFBJSON({...goodMessage})).to.deep.equal({
        ...goodMessage,
        messaging_type: FB_MESSAGING_TYPE_RESPONSE,
        message: {
          ...goodMessage.message,
          attachment: {
            ...goodMessage.message.attachment,
            type: TYPE_VIDEO,
            payload: {
              ...goodMessage.message.attachment.payload,
            }
          },
        }
      });
      // if it's a url, you can determine from the extension
      goodMessage = {
        message: {
          attachment: {
            payload: {
              url: 'foobar.png'
            }
          },
        },
        recipient: {
          id: '123',
        },
        messaging_type: 'foo-bar',
      };
      expect(sanitizeFBJSON({...goodMessage})).to.deep.equal({
        ...goodMessage,
        messaging_type: FB_MESSAGING_TYPE_RESPONSE,
        message: {
          ...goodMessage.message,
          attachment: {
            ...goodMessage.message.attachment,
            type: TYPE_IMAGE,
            payload: {
              ...goodMessage.message.attachment.payload,
            }
          },
        }
      });
      // and sometimes that's a video
      goodMessage = {
        message: {
          attachment: {
            payload: {
              url: 'foobar.mp3'
            }
          },
        },
        recipient: {
          id: '123',
        },
        messaging_type: 'foo-bar',
      };
      expect(sanitizeFBJSON({...goodMessage})).to.deep.equal({
        ...goodMessage,
        messaging_type: FB_MESSAGING_TYPE_RESPONSE,
        message: {
          ...goodMessage.message,
          attachment: {
            ...goodMessage.message.attachment,
            type: TYPE_VIDEO,
            payload: {
              ...goodMessage.message.attachment.payload,
            }
          },
        }
      });
    });

    it('should clean quick_replies appropriately', () => {
      let goodMessage = {
        message: {
          text: 'foo bar',
          quick_replies: [],
        },
        recipient: {
          id: '123',
        }
      };
      let answer = {
        ...goodMessage,
        messaging_type: FB_MESSAGING_TYPE_RESPONSE
      };
      delete answer.quick_replies;
      expect(sanitizeFBJSON({...goodMessage})).to.deep.equal(answer);
      // should individually remove quick_replies elements if they are invalid
      goodMessage = {
        message: {
          text: 'foo bar',
          quick_replies: [{}, {invalidProp: 'foo-bar'}],
        },
        recipient: {
          id: '123',
        }
      };
      answer = {
        ...goodMessage,
        messaging_type: FB_MESSAGING_TYPE_RESPONSE
      };
      delete answer.quick_replies;
      expect(sanitizeFBJSON({...goodMessage})).to.deep.equal({
        ...goodMessage,
        messaging_type: FB_MESSAGING_TYPE_RESPONSE
      });
      // ... but keep the good ones
      const goodQr = {title: 'foo-bar', content_type: MESSAGE_TYPE_TEXT, payload: '{"is":"some-json-string"}'};

      goodMessage = {
        message: {
          text: 'foo bar',
          quick_replies: [
            {},
            {title: 'bar-foo', content_type: MESSAGE_TYPE_TEXT},
            {title: 'bar-foo', payload: ''},
            goodQr,
          ],
        },
        recipient: {
          id: '123',
        }
      };
      const sanitizedMessage = sanitizeFBJSON({...goodMessage});
      const cleanQrs = sanitizedMessage.message.quick_replies[0];
      expect(cleanQrs).to.deep.equal(goodQr);
    });
  });
});
