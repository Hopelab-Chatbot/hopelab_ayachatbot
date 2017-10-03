const expect = require('expect');
const testModule = require('../messages');

describe('Messages Module', () => {
    it('should have an getActionForMessage function', () => {
        expect(typeof testModule.getActionForMessage).toEqual('function');
    });

    describe('makePlatformMessagePayload', () => {
        const messages = [
            { id: 1, text: 'message text' },
            { id: 2, text: 'quick reply text', quick_replies: [{}, {}]}
        ];

        it('should create a platform specific text message payload for facebook', () => {
            const message = testModule.makePlatformMessagePayload(1, messages);
    
            expect(message.text).toEqual(messages[0].text);
        });
    
        it('should create a platform specific quick reply message payload for facebook', () => {
            const message = testModule.makePlatformMessagePayload(2, messages);
    
            expect(message.text).toEqual(messages[1].text);
            expect(message.quick_replies).toEqual(messages[1].quick_replies);
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
        }
        const user = {
            history: [{ next: { id: 2 } }, {}],
            blockScope: ['block-1']
        };
        const blocks = [{ id: 'block-1', startMessage: 1 }];

        it('should return a quick reply payload if present', () => {
            const action = testModule.getActionForMessage(messages.quickReply, {}, []);
    
            expect(action).toEqual(messages.quickReply.quick_reply.payload);
        });

        it('should return pointer to next message from last message in history if there is block scope', () => {
            const action = testModule.getActionForMessage(messages.text, user, []);
    
            expect(action).toEqual(user.history[0].next.id);
        });

        it('should start from beginning if there is no block scope', () => {
            let userNoBlockScope = Object.assign({}, user, { blockScope: [] });
            const action = testModule.getActionForMessage(messages.text, userNoBlockScope, blocks);
    
            expect(action).toEqual(blocks[0].startMessage);
        });
    });
});