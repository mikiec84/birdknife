/* eslint-disable import/no-unresolved */

import { expect } from 'chai';
import { describe, it } from 'mocha';
import ShortIdGenerator from '../libs/short-id-generator';

describe('ShortIdGenerator', () => {
    const shortIdGenerator = new ShortIdGenerator();

    describe('#generate', () => {
        it('returns "a0" as the first id', () => {
            const id = shortIdGenerator.generate();
            expect(id).to.equal('a0');
        });
        it('returns "a1" as the second id', () => {
            const id = shortIdGenerator.generate();
            expect(id).to.equal('a1');
        });
        it('returns "a0" again after 934 iterations', () => {
            let id;
            for (let i = 0; i < 934; i++) { // MAX - MIN - 2
                id = shortIdGenerator.generate();
            }
            expect(id).to.equal('a0');
        });
    });

    describe('#generateSpecial', () => {
        it('returns "da0" as the first id', () => {
            const id = shortIdGenerator.generateSpecial('d');
            expect(id).to.equal('da0');
        });
        it('returns "xa1" as the second id', () => {
            const id = shortIdGenerator.generateSpecial('x');
            expect(id).to.equal('xa1');
        });
    });
});

