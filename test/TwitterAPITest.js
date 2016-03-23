process.env.NODE_ENV = 'test';

var expect = require('chai').expect,
    describe = require("mocha").describe,
    it = require("mocha").it
    vorpal = require('vorpal')(),
    preferences = require('../libs/birdknife-preferences'),
    path = require('path'),
    DataStore = require('nedb'),
    store = new DataStore(),
    api = require('../libs/TwitterAPI');

preferences.init();

describe('TwitterAPI', function() {
    describe('Login', function() {
        before('Authorizing', function() {
            api.login(preferences, vorpal, store);
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
