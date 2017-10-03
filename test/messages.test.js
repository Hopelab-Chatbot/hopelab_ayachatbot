const expect = require('expect');
const testModule = require('../src/messages');

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

    describe('updateBlockScope', () => {
        it('should remove last element if it is marked isEnd', () => {
            const blocks = [{},{},{}];
            let blockScope;
            
            blockScope = testModule.updateBlockScope({ isEnd: true}, blocks);
            expect(blockScope.length).toEqual(2);

            blockScope = testModule.updateBlockScope({ isEnd: false}, blocks);
            expect(blockScope.length).toEqual(3);
        });

        it('should push a new block scope in if current message points to a next block', () => {
            const blocks = [{},{},{}];
            let blockScope;

            blockScope = testModule.updateBlockScope({ next: { id: 'block-2' }}, blocks);
            expect(blockScope.length).toEqual(4);

            blockScope = testModule.updateBlockScope({ }, blocks);
            expect(blockScope.length).toEqual(3);
        });
    });

    describe('updateHistory', () => {
        it('should push a new message into history', () => {
            const history = [{},{},{}];

            const newHistory = testModule.updateHistory({}, history);

            expect(newHistory.length).toEqual(4);
        });
    });

    describe('getNextMessage', () => {
        const user = {
            history: [ { block: 'block-1', next: { afterBlock: '2' }} ],
            blockScope: ['block-1']
        };

        const messages = [
            { id: '1', text: 'message 1' }, 
            { id: '2', text: 'message 2' },
            { id: '3', text: 'message 3' },
        ]

        it('should get next message from block scope and history if message is last and there are more blocks', () => {
            const message = testModule.getNextMessage(
                { isEnd: true },
                user,
                messages,
                []
            );

            expect(message).toEqual(messages[1]);
        });

        it('should return null if message is last and block scope is empty', () => {
            const message = testModule.getNextMessage(
                { isEnd: true },
                Object.assign({}, user, { blockScope: [] }),
                messages,
                []
            );

            expect(message).toNotExist();
        });

        it('should follow the block path if next message is pointing to a block', () => {
            const message = testModule.getNextMessage(
                { next: { id: 'block-2' } },
                Object.assign({}, user, { blockScope: [] }),
                messages,
                [{ id: 'block-2', startMessage: '1' }]
            );

            expect(message).toEqual(messages[0]);
        });

        it('should return the next message id', () => {
            const nextMessage = '3';

            const message = testModule.getNextMessage(
                { next: { id: nextMessage } },
                Object.assign({}, user, { blockScope: [{}] }),
                messages,
                []
            );

            expect(message).toEqual(messages[2]);
        })
    });

    describe('getMessagesForAction', () => {
        const messages = require('../stubs/messages.json');
        const blocks = require('../stubs/blocks.json');

        it('should return the next set of messages', () => {
            let nextMessages = testModule.getMessagesForAction({
                action: 'message-1',
                messages,
                blocks,
                user: {
                    blockScope: [],
                    history: []
                }
            });

            expect(nextMessages.messagesToSend.length).toEqual(3);
        });

        it('should return the correct history for messages sent', () => {
            let nextMessages = testModule.getMessagesForAction({
                action: 'message-1',
                messages,
                blocks,
                user: {
                    blockScope: [],
                    history: []
                }
            });

            expect(nextMessages.history.length).toEqual(3);
        });

        it('should return the correct number of blocks for block scope', () => {
            let nextMessages = testModule.getMessagesForAction({
                action: 'message-1',
                messages,
                blocks,
                user: {
                    blockScope: [],
                    history: []
                }
            });

            expect(nextMessages.blockScope.length).toEqual(1);
        });

    });
});