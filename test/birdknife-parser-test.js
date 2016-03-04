process.env.NODE_ENV = 'test';

var expect = require('chai').expect,
    birdknife_parser = require('../libs/birdknife-parser');

describe('birdknife-parser', function() {
    describe('#parse', function() {
        it('returns the unmodified command if command is falsy', function() {
            var parsed = birdknife_parser.parse(null, null);
            expect(parsed).to.not.be.ok;
        });

        it('returns the unmodified command if it is a vorpal command', function() {
            var command = '/some_command arg1 arg2';
            var parsed = birdknife_parser.parse(command, null);

            expect(parsed).to.equal(command);
        });

        it('correctly escapes single and double quotes', function() {
            var command = 'This is a \'Test\' with "Quotes"';
            var args = command;
            var parsed = birdknife_parser.parse(command, args);

            expect(parsed).to.equal('\'This is a &bquot;Test&bquot; with "Quotes"\'');
        });
    });

    describe('#parseReply', function() {
        it('correctly escapes single and double quotes ignoring the vorpal command and the id argument', function() {
            var command = '/reply a1 This is a \'Test\' reply with "Quotes"';
            var args = 'a1 This is a \'Test\' reply with "Quotes"';
            var parsed = birdknife_parser.parseReply(command, args);

            expect(parsed).to.equal('/reply a1 \'This is a &bquot;Test&bquot; reply with "Quotes"\'');
        });
    });
});
