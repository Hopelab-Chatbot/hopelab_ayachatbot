const expect = require('chai').expect;
const testModule = require('../src/messages');
const {
  TYPE_BLOCK,
  TYPE_QUESTION_WITH_REPLIES,
  TYPE_MESSAGE,
} = require('../src/constants');

const media = require('../stubs/media.json');

describe('Messages Module', () => {
    it('should have an getActionForMessage function', () => {
        expect(typeof testModule.getActionForMessage).to.equal('function');
    });

    describe('makePlatformMessagePayload', () => {
        const messages = [
            {
              id: 1,
              text: 'message text',
              messageType: TYPE_MESSAGE
            },
            {
              id: 2,
              text: 'quick reply text',
              quick_replies: [
                {title: "stuff", payload: "{\"id\":\"1234\",\"type\":\"message\"}"},
                {title: "other stuff", payload: "{\"id\":\"1234\",\"type\":\"message\"}"}
              ],
              messageType: TYPE_QUESTION_WITH_REPLIES,
            },
            {
              id: 3,
              text: 'quick reply text',
              quick_replies: [{}],
              messageType: TYPE_QUESTION_WITH_REPLIES,
            }
        ];

        it('creates a platform specific text message payload for facebook', () => {
            const message = testModule.makePlatformMessagePayload(1, messages);
            expect(message.text).to.equal(messages[0].text);
        });

        it('creates a platform specific quick reply message payload for facebook', () => {
            const message = testModule.makePlatformMessagePayload(2, messages);

            expect(message.text).to.equal(messages[1].text);
            const qrSolutions = messages[1].quick_replies;
            expect(message.quick_replies.length).to.equal(2);
            expect(message.quick_replies).to.deep.equal(qrSolutions);
        });

        it('creats a quick reply message even if the payload is undefined', () => {
            const message = testModule.makePlatformMessagePayload(3, messages);

            expect(message.text).to.equal(messages[2].text);
            const qrSolutions = messages[2].quick_replies;
            expect(message.quick_replies.length).to.equal(1);
            expect(message.quick_replies[0].title).to.be.undefined;
            expect(message.quick_replies[0].payload).to.equal("{}")
        });
    });

    describe('getActionForMessage', () => {
        const messages = {
            quickReply: {
                quick_reply: {
                    payload: 'quick reply payload'
                }
            },
            text: {}
        };
        const user = {
            history: [{ next: { id: 2 } }, {}],
            blockScope: ['block-1']
        };
        const blocks = [{ id: 'block-1', startMessage: 1 }];

        it('returns a quick reply payload if present', () => {
            const action = testModule.getActionForMessage(
                messages.quickReply,
                {},
                []
            );

            expect(action).to.equal(messages.quickReply.quick_reply.payload);
        });

        it('returns pointer to next message from last message in history if there is block scope', () => {
            const action = testModule.getActionForMessage(
                messages.text,
                user,
                []
            );

            expect(action).to.equal(user.history[0].next.id);
        });

        it('starts from beginning if there is no block scope', () => {
            let userNoBlockScope = Object.assign({}, user, { blockScope: [] });
            const action = testModule.getActionForMessage(
                messages.text,
                userNoBlockScope,
                blocks
            );

            expect(action).to.equal(blocks[0].startMessage);
        });
    });

    describe('getNextMessage', () => {
        const user = {
            history: [
                { block: 'block-1', next: { type: TYPE_BLOCK, after: '2' } }
            ],
            blockScope: ['block-1']
        };

        const messages = [
            { id: '1', text: 'message 1' },
            { id: '2', text: 'message 2' },
            { id: '3', text: 'message 3' }
        ];

        it('gets next message from block scope and history if message is last and there are more blocks', () => {
            const message = testModule.getNextMessage(
                { isEnd: true },
                user,
                messages,
                []
            );

            expect(message).to.equal(messages[1]);
        });

        it('returns null if message is last and block scope is empty', () => {
            const message = testModule.getNextMessage(
                { isEnd: true },
                Object.assign({}, user, { blockScope: [] }),
                messages,
                []
            );

            expect(message).toNotExist();
        });

        it('follows the block path if next message is pointing to a block', () => {
            const message = testModule.getNextMessage(
                { next: { id: 'block-2', type: TYPE_BLOCK } },
                Object.assign({}, user, { blockScope: [] }),
                messages,
                [{ id: 'block-2', startMessage: '1' }]
            );

            expect(message).to.equal(messages[0]);
        });

        it('returns the next message id', () => {
            const nextMessage = '3';

            const message = testModule.getNextMessage(
                { next: { id: nextMessage } },
                Object.assign({}, user, { blockScope: [{}] }),
                messages,
                []
            );

            expect(message).to.equal(messages[2]);
        });
    });

    describe('getMessagesForAction', () => {
        const messages = require('../stubs/messages.json');
        const blocks = require('../stubs/blocks.json');

        it('returns the next set of messages', () => {
            let nextMessages = testModule.getMessagesForAction({
                action: blocks[0].startMessage,
                messages,
                blocks,
                user: {
                    blockScope: [],
                    history: []
                }
            });

            expect(nextMessages.messagesToSend.length).to.equal(2);
        });

        it('returns the correct history for messages sent', () => {
            let nextMessages = testModule.getMessagesForAction({
                action: blocks[0].startMessage,
                messages,
                blocks,
                user: {
                    blockScope: [],
                    history: []
                }
            });

            expect(nextMessages.history.length).to.equal(2);
        });

        it('returns the correct number of blocks for block scope', () => {
            let nextMessages = testModule.getMessagesForAction({
                action: blocks[0].startMessage,
                messages,
                blocks,
                user: {
                    blockScope: [blocks[0].id],
                    history: []
                }
            });

            expect(nextMessages.blockScope.length).to.equal(1);
        });

        it('handles stringing together media messages', () => {
            let nextMessages = testModule.getMessagesForAction({
                action: 'message-204',
                messages,
                blocks,
                user: {
                    blockScope: ['block-1', 'block-2'],
                    history: []
                },
                media
            });

            expect(nextMessages.messagesToSend.length).to.equal(7);
        });
    });

    describe('getMediaUrlForMessage', () => {
        it('returns a url for the media type', () => {
            let url = testModule.getMediaUrlForMessage('image', {}, media);
            let mediaElement = media['image'].find(m => m.url === url);

            expect(mediaElement.url).to.equal(url);

            url = testModule.getMediaUrlForMessage('video', {}, media);
            mediaElement = media['video'].find(m => m.url === url);

            expect(mediaElement.url).to.equal(url);
        });
    });

    describe('makePlatformMediaMessagePayload', () => {
        it('creates a payload for a media element', () => {
            const videoUrl = 'http://video';
            const imageUrl = 'http://image';

            let payload = testModule.makePlatformMediaMessagePayload(
                'video',
                videoUrl
            );

            expect(payload.attachment.type).to.equal('video');
            expect(payload.attachment.payload.url).to.equal(videoUrl);

            payload = testModule.makePlatformMediaMessagePayload(
                'image',
                imageUrl
            );

            expect(payload.attachment.type).to.equal('image');
            expect(payload.attachment.payload.url).to.equal(imageUrl);
        });
    });
});
