process.env.NODE_ENV = 'test';

var expect = require('chai').expect,
    birdknife_delimiter = require('../libs/birdknife-delimiter');

describe('birdknife-delimiter', function() {
    describe('#isCommand', function() {
        it('recognizes commands', function() {
            var c1 = birdknife_delimiter.isCommand('/a');
            var c2 = birdknife_delimiter.isCommand('/reply');
            var c3 = birdknife_delimiter.isCommand('/asdofi4329 arg1 arg2');

            expect(c1).to.be.ok;
            expect(c2).to.be.ok;
            expect(c3).to.be.ok;

            var s1 = birdknife_delimiter.isCommand('reply');
            var s2 = birdknife_delimiter.isCommand('reply arg1 arg2');
            var s3 = birdknife_delimiter.isCommand('reply /command');

            expect(s1).to.not.be.ok;
            expect(s2).to.not.be.ok;
            expect(s3).to.not.be.ok;
        });
        
        it('recognizes quote commands', function() {
            var q1 = birdknife_delimiter.isQuote('/quote a0 ');
            var q2 = birdknife_delimiter.isQuote('/quote be This is a comment');
            var q3 = birdknife_delimiter.isQuote('/quote ax try /quote');
            var q4 = birdknife_delimiter.isQuote('/quote zz ');

            expect(q1).to.be.ok;
            expect(q2).to.be.ok;
            expect(q3).to.be.ok;
            expect(q4).to.be.ok;

            var nq1 = birdknife_delimiter.isQuote('a');
            var nq2 = birdknife_delimiter.isQuote('/a');
            var nq3 = birdknife_delimiter.isQuote('/quote');
            var nq4 = birdknife_delimiter.isQuote('/quote ai');
            var nq5 = birdknife_delimiter.isQuote('/quote a ');
            var nq6 = birdknife_delimiter.isQuote('/quote /quote c6 ');
            var nq7 = birdknife_delimiter.isQuote('/quote  al ');
            var nq8 = birdknife_delimiter.isQuote('/reply al ');

            expect(nq1).to.not.be.ok;
            expect(nq2).to.not.be.ok;
            expect(nq3).to.not.be.ok;
            expect(nq4).to.not.be.ok;
            expect(nq5).to.not.be.ok;
            expect(nq6).to.not.be.ok;
            expect(nq7).to.not.be.ok;
            expect(nq8).to.not.be.ok;
        });

        it('recognizes reply commands', function() {
            var r1 = birdknife_delimiter.isReply('/reply a0 ');
            var r2 = birdknife_delimiter.isReply('/reply be This is a reply');
            var r3 = birdknife_delimiter.isReply('/reply ax try /quote');
            var r4 = birdknife_delimiter.isReply('/reply zz ');

            expect(r1).to.be.ok;
            expect(r2).to.be.ok;
            expect(r3).to.be.ok;
            expect(r4).to.be.ok;

            var nr1 = birdknife_delimiter.isReply('a');
            var nr2 = birdknife_delimiter.isReply('/a');
            var nr3 = birdknife_delimiter.isReply('/reply');
            var nr4 = birdknife_delimiter.isReply('/reply ai');
            var nr5 = birdknife_delimiter.isReply('/reply a ');
            var nr6 = birdknife_delimiter.isReply('/reply /reply c6 ');
            var nr7 = birdknife_delimiter.isReply('/reply  al ');
            var nr8 = birdknife_delimiter.isReply('/quote al ');

            expect(nr1).to.not.be.ok;
            expect(nr2).to.not.be.ok;
            expect(nr3).to.not.be.ok;
            expect(nr4).to.not.be.ok;
            expect(nr5).to.not.be.ok;
            expect(nr6).to.not.be.ok;
            expect(nr7).to.not.be.ok;
            expect(nr8).to.not.be.ok;
        });
    });
});
