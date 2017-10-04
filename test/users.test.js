const expect = require('expect');
const testModule = require('../src/users');

describe('Users Module', () => {
    describe('createNewUser', () => {
        it('returns a default user object for given id', () => {
            const newUser = testModule.createNewUser('12345');

            expect(newUser.id).toEqual('12345');
        });
    });

    describe('updateBlockScope', () => {
        it('removes last element if it is marked isEnd', () => {
            const blocks = [{}, {}, {}];
            let blockScope;

            blockScope = testModule.updateBlockScope({ isEnd: true }, blocks);
            expect(blockScope.length).toEqual(2);

            blockScope = testModule.updateBlockScope({ isEnd: false }, blocks);
            expect(blockScope.length).toEqual(3);
        });

        it('pushes a new block scope in if current message points to a next block', () => {
            const blocks = [{}, {}, {}];
            let blockScope;

            blockScope = testModule.updateBlockScope(
                { next: { id: 'block-2' } },
                blocks
            );
            expect(blockScope.length).toEqual(4);

            blockScope = testModule.updateBlockScope({}, blocks);
            expect(blockScope.length).toEqual(3);
        });
    });

    describe('updateHistory', () => {
        it('pushes a new message into history', () => {
            const history = [{}, {}, {}];

            const newHistory = testModule.updateHistory({}, history);

            expect(newHistory.length).toEqual(4);
        });
    });

    describe('getPreviousMessageInHistory', () => {

        const messages = [{ id: 1 }];
        const user = { history: [{ id: 1 }] };

        it('returns the previous message in the user history', () => {
            const message = testModule.getPreviousMessageInHistory(messages, user);

            expect(message).toEqual(messages[0]);
        });
    });

    describe('isNextMessageBlock', () => {
        it('says if next message is a block element', () => {
            expect(
                testModule.isNextMessageBlock({ next: { id: 'block-1' } })
            ).toBe(true);

            expect(
                testModule.isNextMessageBlock({ next: { id: 'message-1' } })
            ).toBe(false);
        });
    });
});
