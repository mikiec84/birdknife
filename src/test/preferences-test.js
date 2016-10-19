/* eslint-disable import/no-unresolved */

import { assert } from 'chai';
import { describe, it } from 'mocha';
import Preferences from '../libs/preferences';

describe('Preferences', () => {
    it('should be able to read and write preferences', () => {
        const preferences = new Preferences();

        preferences.set('debug', true);
        assert.isTrue(preferences.get('debug'), 'debug is set to true');

        preferences.set('debug', false);
        assert.isFalse(preferences.get('debug'), 'debug is set to false');
    });
});
