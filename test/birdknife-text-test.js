process.env.NODE_ENV = 'test';

var expect = require('chai').expect,
    birdknife_text = require('../libs/birdknife-text');

describe('birdknife-text', function() {
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
