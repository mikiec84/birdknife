process.env.NODE_ENV = 'test';

var expect = require('chai').expect,
    vorpal = require('vorpal')(),
    nconf = require('nconf'),
    path = require('path'),
    DataStore = require('nedb'),
    store = new DataStore(),
    api = require('../libs/TwitterAPI');

nconf.argv()
    .env()
    .file({ file: path.join(path.dirname(__filename), 'config_travis.json') });

describe('TwitterAPI', function() {
    describe('Login', function() {
        before('Authorizing', function() {
            api.login(nconf.get('auth:consumer_key'),
                nconf.get('auth:consumer_secret'),
                nconf.get('auth:access_token'),
                nconf.get('auth:access_token_secret'),
                vorpal, store);
        });

        it('should have authorized after 4 seconds', function(done) {
            this.timeout(5000);
            setTimeout(function() {
                expect(api.T).to.be.ok;
                done();
            }, 4000);
        });

        it('should have loaded my user profile', function(done) {
            setTimeout(function() {
                expect(api.ME.screen_name).to.equal('_vanita5');
                done();
            }, 500);
        });
    });
});
