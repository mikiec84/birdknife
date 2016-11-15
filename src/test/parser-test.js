/* eslint-disable import/no-unresolved, spaced-comment, no-unused-expressions */

import { expect } from 'chai';
import { describe, it } from 'mocha';
import Parser from '../libs/parser';

describe('Parser', () => {
    describe('#parseStatus', () => {
        it('returns the unmodified command if command is falsy', () => {
            const parsed = Parser.parseStatus(null, null);
            //noinspection BadExpressionStatementJS
            expect(parsed).to.not.be.ok;
        });

        it('returns the unmodified command if it is a vorpal command', () => {
            const command = '/some_command arg1 arg2';
            const parsed = Parser.parseStatus(command, null);

            expect(parsed).to.equal(command);
        });

        it('correctly escapes single and double quotes', () => {
            const command = 'This is a \'Test\' with "Quotes"';
            //noinspection UnnecessaryLocalVariableJS
            const args = command;
            const parsed = Parser.parseStatus(command, args);

            expect(parsed).to.equal('\'This is a &bquot;Test&bquot; with "Quotes"\'');
        });
    });

    describe('#parseCommand', () => {
        it('returns the unmodified command if command is falsy', () => {
            const parsed = Parser.parseCommand(null, null);
            //noinspection BadExpressionStatementJS
            expect(parsed).to.not.be.ok;
        });

        it('returns the unmodified command if it is not a vorpal command', () => {
            const command = 'some_command arg1 arg2';
            const parsed = Parser.parseCommand(command, null);

            expect(parsed).to.equal(command);
        });

        it('correctly escapes single and double quotes ignoring the vorpal command and the id argument', () => {
            const command = '/reply a1 This is a \'Test\' reply with "Quotes"';
            const args = 'a1 This is a \'Test\' reply with "Quotes"';
            const parsed = Parser.parseCommand(command, args);

            expect(parsed).to.equal('/reply a1 \'This is a &bquot;Test&bquot; reply with "Quotes"\'');
        });
    });

    describe('#postParse', () => {
        it('should replace placeholders with their original value', () => {
            const parsed = '/reply a1 \'This is a &bquot;Test&bquot; reply with "Quotes" and an &bequals; char.\'';
            const postParsed = Parser.postParse(parsed);

            expect(postParsed).to.equal('/reply a1 \'This is a \'Test\' reply with "Quotes" and an = char.\'');
        });
    });
});

