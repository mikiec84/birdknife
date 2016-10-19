/* eslint-disable import/no-unresolved */

import { expect } from 'chai';
import { describe, it } from 'mocha';
import Location from '../libs/location';

describe('Location', () => {
    describe('#getAutoLocation', () => {
        it('should return a valid location', () => {
            const location = Location.getLocationAuto();
            expect(location).to.have.property('lat');
            expect(location).to.have.property('lng');
        });
    });
});
