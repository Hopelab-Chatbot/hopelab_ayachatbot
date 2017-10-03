const expect = require('expect');
const testModule = require('../src/users');

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