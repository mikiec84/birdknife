/* eslint-disable import/no-unresolved, no-unused-expressions */

import { expect } from 'chai';
import { describe, it, before } from 'mocha';
import Vorpal from 'vorpal';
import DataStore from 'nedb';
import TwitterAPI from '../libs/twitter-api';
import Preferences from '../libs/preferences';

const vorpal = new Vorpal();
const store = new DataStore();
const preferences = new Preferences();
const api = new TwitterAPI(preferences, vorpal, store);

describe('TwitterAPI', () => {
    describe('Login', () => {
        before('Authorizing', () => {
            api.login();
        });

        it('should have authorized after 4 seconds', function (done) {
            this.timeout(5000);
            setTimeout(() => {
                expect(api.T).to.be.ok;
                done();
            }, 4000);
        });

        it('should have loaded my user profile', () => {
            expect(api.ME.screen_name).to.equal('_vanita5');
        });
    });
});
