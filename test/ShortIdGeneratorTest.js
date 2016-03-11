process.env.NODE_ENV = 'test';

var expect = require('chai').expect,
    shortIdGenerator = require('../libs/ShortIdGenerator'),
    describe = require("mocha").describe,
    it = require("mocha").it;

describe('ShortIdGenerator', function() {
    describe('#generate', function() {
        it('returns "a0" as the first id', function() {
            var id = shortIdGenerator.generate();
            expect(id).to.equal('a0');
        });
        it('returns "a1" as the second id', function() {
            var id = shortIdGenerator.generate();
            expect(id).to.equal('a1');
        });
        it('returns "a0" again after 934 iterations', function() {
            var id;
            for (var i = 0; i < 934; i++) { // MAX - MIN - 2
                id = shortIdGenerator.generate();
            }
            expect(id).to.equal('a0');
        });
    });

    describe('#generateSpecial', function() {
        it('returns "da0" as the first id', function() {
            var id = shortIdGenerator.generateSpecial('d');
            expect(id).to.equal('da0');
        });
        it('returns "xa1" as the second id', function() {
            var id = shortIdGenerator.generateSpecial('x');
            expect(id).to.equal('xa1');
        });
    });
});

