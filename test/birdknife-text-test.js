process.env.NODE_ENV = 'test';

var expect = require('chai').expect,
    birdknife_text = require('../libs/birdknife-text');

describe('birdknife-text', function() {

    describe('#isCommand', function() {
        it('recognizes commands', function() {
            var c1 = birdknife_text.isCommand('/a');
            var c2 = birdknife_text.isCommand('/reply');
            var c3 = birdknife_text.isCommand('/asdofi4329 arg1 arg2');

            expect(c1).to.be.ok;
            expect(c2).to.be.ok;
            expect(c3).to.be.ok;

            var s1 = birdknife_text.isCommand('reply');
            var s2 = birdknife_text.isCommand('reply arg1 arg2');
            var s3 = birdknife_text.isCommand('reply /command');

            expect(s1).to.not.be.ok;
            expect(s2).to.not.be.ok;
            expect(s3).to.not.be.ok;
        });
    });

    describe('#isQuote', function() {
        it('recognizes quote commands', function() {
            var q1 = birdknife_text.isQuote('/quote a0 ');
            var q2 = birdknife_text.isQuote('/quote be This is a comment');
            var q3 = birdknife_text.isQuote('/quote ax try /quote');
            var q4 = birdknife_text.isQuote('/quote zz ');

            expect(q1).to.be.ok;
            expect(q2).to.be.ok;
            expect(q3).to.be.ok;
            expect(q4).to.be.ok;

            var nq1 = birdknife_text.isQuote('a');
            var nq2 = birdknife_text.isQuote('/a');
            var nq3 = birdknife_text.isQuote('/quote');
            var nq4 = birdknife_text.isQuote('/quote ai');
            var nq5 = birdknife_text.isQuote('/quote a ');
            var nq6 = birdknife_text.isQuote('/quote /quote c6 ');
            var nq7 = birdknife_text.isQuote('/quote  al ');
            var nq8 = birdknife_text.isQuote('/reply al ');

            expect(nq1).to.not.be.ok;
            expect(nq2).to.not.be.ok;
            expect(nq3).to.not.be.ok;
            expect(nq4).to.not.be.ok;
            expect(nq5).to.not.be.ok;
            expect(nq6).to.not.be.ok;
            expect(nq7).to.not.be.ok;
            expect(nq8).to.not.be.ok;
        });
    });

    describe('#isReply', function() {
        it('recognizes reply commands', function() {
            var r1 = birdknife_text.isReply('/reply a0 ');
            var r2 = birdknife_text.isReply('/reply be This is a reply');
            var r3 = birdknife_text.isReply('/reply ax try /quote');
            var r4 = birdknife_text.isReply('/reply zz ');

            expect(r1).to.be.ok;
            expect(r2).to.be.ok;
            expect(r3).to.be.ok;
            expect(r4).to.be.ok;

            var nr1 = birdknife_text.isReply('a');
            var nr2 = birdknife_text.isReply('/a');
            var nr3 = birdknife_text.isReply('/reply');
            var nr4 = birdknife_text.isReply('/reply ai');
            var nr5 = birdknife_text.isReply('/reply a ');
            var nr6 = birdknife_text.isReply('/reply /reply c6 ');
            var nr7 = birdknife_text.isReply('/reply  al ');
            var nr8 = birdknife_text.isReply('/quote al ');

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
    
    describe('#getStatusURL', function() {
        it('returns a valid status url', function() {
            var ex = 'https://twitter.com/screenname/status/123456789012345678';

            var dummy = {
                "id_str": "123456789012345678",
                "user": {
                    "screen_name": "screenname"
                }
            };
            var res = birdknife_text.getStatusURL(dummy);

            expect(res).to.equal(ex);
        });
    });
});
