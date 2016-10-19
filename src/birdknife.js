#!/usr/bin/env node

/* eslint-disable import/no-unresolved */

import util from 'util';
import _ from 'lodash';
import Vorpal from 'vorpal';
import vorpalAutocomplete from 'vorpal-autocomplete-fs';
import Update from 'update-notifier';
import columnify from 'columnify';
import DataStore from 'nedb';
import TwitterPinAuth from 'twitter-pin-auth';
import Delimiter from './libs/delimiter';
import TwitterAPI from './libs/twitter-api';
import Color from './libs/color-definitions';
import BirdknifeText from './libs/text';
import Autocomplete from './libs/autocomplete';
import Parser from './libs/parser';
import Preferences from './libs/preferences';
import Timer from './libs/timer';

const vorpal = new Vorpal();
const store = new DataStore();
const preferences = new Preferences();
const delimiter = new Delimiter();
const pkg = require('../package.json');

const cache = {};
cache.usernames = new DataStore({
    filename: 'usernames.db',
    autoload: true
});
cache.hashtags = new DataStore({
    filename: 'hashtags.db',
    autoload: true
});

cache.usernames.ensureIndex({ fieldName: 'k', unique: true }, error => {
    if (error) vorpal.log(Color.error(`Database error: ${error}`));
});

cache.hashtags.ensureIndex({ fieldName: 'k', unique: true }, error => {
    if (error) vorpal.log(Color.error(`Database error: ${error}`));
});

const api = new TwitterAPI(preferences, vorpal, store, cache);

vorpal
    .command('/show <id>', 'Show stored tweet by id')
    .option('--debug', 'Show full tweet object')
    .action((args, callback) => {
        store.findOne({ id: args.id }, (err, doc) => {
            if (err) {
                vorpal.activeCommand.log(Color.error(`Error: ${err}`));
                return callback();
            }
            if (!doc) {
                vorpal.activeCommand.log(Color.error('Warning: No status found with this id.'));
                return callback();
            }

            const obj = doc.status || doc.message;
            if (args.options.debug || doc.type === 'message') {
                vorpal.activeCommand.log(
                    util.inspect(obj, { showHidden: false, depth: null })
                );
            } else {
                let log = '\n';
                log += `|\t${Color.bold('User:')} ${obj.user.name} (@${obj.user.screen_name})\n`;
                log += '|\t\n';
                log += `|\t${Color.bold('Text:')} ${obj.text}\n`;
                log += `|\t${Color.bold('Created At:')} ${obj.created_at}\n`;
                log += `|\t${Color.bold('Favorites:')} ${obj.favorite_count || '0'}\n`;
                log += `|\t${Color.bold('Retweets:')} ${obj.retweet_count || '0'}\n`;
                if (obj.place) {
                    log += `|\t${Color.bold('Location: ')}${obj.place.full_name}\n`;
                }
                if (obj.coordinates) {
                    const coordinates = obj.coordinates.coordinates;
                    log += `|\t${Color.bold('Location (Coordinates):')} ${coordinates[0]}, ${coordinates[1]}\n`;
                }
                log += `|\t${Color.bold('Source:')} ${obj.source}\n`;
                vorpal.activeCommand.log(log);
            }
            callback();
        });
    });

vorpal
    .command('/delete <id>', 'Delete a tweet')
    .alias('/del')
    .action((args, callback) => {
        store.findOne({ id: args.id }, (err, doc) => {
            if (err) {
                vorpal.activeCommand.log(Color.error(`Error: ${err}`));
                return callback();
            }
            if (!doc || doc.type !== 'status') {
                vorpal.activeCommand.log(Color.error('Warning: No status found with this id.'));
                return callback();
            }

            api.delete(doc.status, callback);
        });
    });

vorpal
    .command('/again [screen_name]', 'Reload home timeline or specified users timeline')
    .action((args, callback) => {
        vorpal.activeCommand.log(Color.blue('-- Loading tweets...'));
        api.loadTimeline(args.screen_name);
        callback();
    });

vorpal
    .command('/dms', 'Show DMs')
    .option('--sent', 'Show sent DMs')
    .action((args, callback) => {
        vorpal.activeCommand.log(Color.blue('-- Loading DMs...'));
        if (args.options.sent) {
            api.loadSentDMs();
        } else {
            api.loadDMs();
        }
        callback();
    });

vorpal
    .command('/replies', 'Show latest 20 mentions')
    .action((args, callback) => {
        vorpal.activeCommand.log(Color.blue('-- Loading replies...'));
        api.loadReplies();
        callback();
    });

vorpal
    .command('/search <query...>', 'Search')
    .alias('/se')
    .parse(Parser.parseCommand)
    .action((args, callback) => {
        vorpal.activeCommand.log(Color.blue('-- Searching...'));
        let query = args.query.join(' ');
        query = Parser.postParse(query);
        api.search(query);
        callback();
    });

vorpal
    .command('/retweet <id>', 'Retweet status with id')
    .alias('/rt')
    .action((args, callback) => {
        store.findOne({ id: args.id }, (err, doc) => {
            if (err) return vorpal.activeCommand.log(Color.error(`Error: ${err}`));

            if (!doc || doc.type !== 'status') {
                return vorpal.activeCommand.log(Color.error('Warning: No status found with this id.'));
            }

            api.retweet(doc.status.id_str);
        });
        callback();
    });

vorpal
    .command('/like <id>', 'Like/Favorite status with id')
    .alias('/fav')
    .action((args, callback) => {
        store.findOne({ id: args.id }, (err, doc) => {
            if (err) return vorpal.activeCommand.log(Color.error(`Error: ${err}`));

            if (!doc || doc.type !== 'status') {
                return vorpal.activeCommand.log(Color.error('Warning: No status found with this id.'));
            }

            api.like(doc.status.id_str);
        });
        callback();
    });

vorpal
    .command('/unlike <id>', 'Remove like/favorite from status with id')
    .alias('/unfav')
    .action((args, callback) => {
        store.findOne({ id: args.id }, (err, doc) => {
            if (err) return vorpal.activeCommand.log(Color.error(`Error: ${err}`));

            if (!doc || doc.type !== 'status') {
                return vorpal.activeCommand.log(Color.error('Warning: No status found with this id.'));
            }

            api.unlike(doc.status.id_str);
        });
        callback();
    });

vorpal
    .command('/follow <screen_name>', 'Follow user with given name')
    .action((args, callback) => {
        api.follow(args.screen_name);
        callback();
    });

vorpal
    .command('/unfollow <screen_name>', 'Unfollow user with given name')
    .action((args, callback) => {
        api.unfollow(args.screen_name);
        callback();
    });

vorpal
    .command('/block <screen_name>', 'Block user with given name')
    .action((args, callback) => {
        api.block(args.screen_name);
        callback();
    });

vorpal
    .command('/unblock <screen_name>', 'Unblock user with given name')
    .action((args, callback) => {
        api.unblock(args.screen_name);
        callback();
    });

vorpal
    .command('/mute <screen_name>', 'Mute user with given name')
    .action((args, callback) => {
        api.mute(args.screen_name);
        callback();
    });

vorpal
    .command('/unmute <screen_name>', 'Unmute user with given name')
    .action((args, callback) => {
        api.unmute(args.screen_name);
        callback();
    });

vorpal
    .command('/reply <id> <text...>', 'Reply to a tweet')
    .alias('/re')
    .parse(Parser.parseCommand)
    .action((args, callback) => {
        let text = args.text.join(' ');
        text = Parser.postParse(text);

        store.findOne({ id: args.id }, (err, doc) => {
            if (err) return vorpal.activeCommand.log(Color.error(`Error: ${err}`));

            if (!doc) {
                return vorpal.activeCommand.log(Color.error('Warning: No status or message found with this id.'));
            }

            switch (doc.type) {
                case 'status':
                    text = BirdknifeText.addMentionsToReply(api.ME.screen_name, text, doc.status);
                    api.reply(text, doc.status.id_str);
                    break;

                case 'message':
                    api.message(doc.message.sender_screen_name, text);
                    break;

                default:
                    vorpal.activeCommand.log(Color.error('Warning: Unsupported command for this element.'));
            }
        });
        callback();
    });

vorpal
    .command('/quote <id> <text...>', 'Quote a tweet')
    .parse(Parser.parseCommand)
    .action((args, callback) => {
        let text = args.text.join(' ');
        text = Parser.postParse(text);

        store.findOne({ id: args.id }, (err, doc) => {
            if (err) return vorpal.activeCommand.log(Color.error(`Error: ${err}`));

            if (!doc || doc.type !== 'status') {
                return vorpal.activeCommand.log(Color.error('Warning: No status found with this id.'));
            }

            const screenName = doc.status.retweeted_status
                ? doc.status.retweeted_status.user.screen_name : doc.status.user.screen_name;
            text += ' ' + BirdknifeText._getStatusURL(screenName, doc.status.id_str);

            api.update(text);
        });
        callback();
    });

vorpal
    .command('/thread <id>', 'Show Conversation')
    .action((args, callback) => {
        vorpal.activeCommand.log(Color.blue('-- Loading conversation. This might take a few seconds...'));

        store.findOne({ id: args.id }, (err, doc) => {
            if (err) return vorpal.activeCommand.log(Color.error(`Error: ${err}`));

            if (!doc || doc.type !== 'status') {
                return vorpal.activeCommand.log(Color.error('Warning: No status found with this id.'));
            }

            api.loadConversation(doc.status);
        });
        callback();
    });

vorpal
    .command('/logout')
    .description('Logout')
    .action((args, callback) => {
        api.logout();
        vorpal.activeCommand.log(Color.success('\nLogged out.\n'));
        vorpal.activeCommand.log(Color.green('Type /login to authenticate with Twitter.'));
        callback();
    });

vorpal
    .command('/login')
    .description('Authenticate with your Twitter account')
    .action((args, callback) => {
        const twitterPinAuth = new TwitterPinAuth(
            preferences.getAuth('consumer_key'),
            preferences.getAuth('consumer_secret')
        );

        twitterPinAuth.requestAuthUrl()
            .then(url => {
                vorpal.activeCommand.log(`${Color.yellow('Login and copy the PIN number:')} ${Color.url(url)}`);
            })
            .catch(err => {
                vorpal.activeCommand.log(Color.error(`Error: ${err}`));
            });

        vorpal.activeCommand.prompt({
            type: 'input',
            name: 'pin',
            default: null,
            message: 'PIN: '
        }, result => {
            if (!result.pin) return;
            twitterPinAuth.authorize(result.pin)
                .then(data => {
                    preferences.setAccessToken(data.accessTokenKey, data.accessTokenSecret);

                    vorpal.activeCommand.log(Color.success('\nAuthentication successful!\n'));
                    vorpal.activeCommand.log(Color.blue('Logging in...'));

                    api.login(preferences, vorpal, store, cache);
                    callback();
                })
                .catch(err => {
                    vorpal.activeCommand.log(Color.error('Authentication failed!'));
                    vorpal.activeCommand.log(err);
                    callback();
                });
        });
    });

vorpal
    .command('/user <screen_name>')
    .description('Display user information')
    .action((args, callback) => {
        vorpal.activeCommand.log(Color.blue('-- Loading user information...'));
        api.loadUser(args.screen_name);
        callback();
    });

vorpal
    .command('/dm <screen_name> <words...>]')
    .description('Send direct message')
    .parse(Parser.parseCommand)
    .action((args, callback) => {
        const screenName = args.screen_name;
        let message = args.words.join(' ');
        message = Parser.postParse(message);
        api.message(screenName, message);
        callback();
    });

vorpal
    .command('/preferences', 'List all preferences')
    .action((args, callback) => {
        const pref = preferences.getAll();

        const data = {};
        for (const k in pref) {
            if ({}.hasOwnProperty.call(pref, k)) {
                data[k] = Color.blue(JSON.stringify(pref[k]));
            }
        }
        vorpal.activeCommand.log(`\n${columnify(data)}\n`);
        callback();
    });

vorpal
    .command('/set <key> <value>', 'Set preference by key')
    .parse(Parser.parseCommand)
    .action((args, callback) => {
        const value = typeof args.value === 'string'
            ? Parser.postParse(args.value)
            : args.value;

        if (preferences.set(args.key, value)) {
            vorpal.activeCommand.log(Color.blue(`${args.key} is now set to ${preferences.get(args.key)}`));
        } else {
            vorpal.activeCommand.log(Color.error(`Error: ${args.key} is not a valid key!`));
        }
        callback();
    });

const expPrompt = (cmd, cb, dirs, status) => {
    status = status || '';
    const _c = BirdknifeText.getRemainingTweetLength(status, dirs);
    const _s = (Delimiter.PAD + _c).slice(-Delimiter.PAD.length);
    return cmd.prompt({
        type: 'input',
        name: 'tweet',
        default: null,
        message: `Tweet [${_s}]> `
    }, result => {
        if (result.tweet === '/cancel') {
            cb();
        } else if (result.tweet === '/send') {
            api.updateWithMedia(status, dirs);
            cb();
        } else if (result.tweet !== '/send') {
            status += '\n' + result.tweet;
            delimiter.updateExplicitCount(status, dirs);
            expPrompt(cmd, cb, dirs, status);
        }
    });
};

vorpal
    .command('/tweet [dirs...]', 'Tweet (optional: add media)')
    .autocomplete(vorpalAutocomplete())
    .action((args, callback) => {
        vorpal.activeCommand.log(
            Color.yellow('\nEnter ') +
            Color.blue('/send ') +
            Color.yellow('to update your status or ') +
            Color.red('/cancel') +
            Color.yellow(' to return to the main prompt.')
        );

        delimiter.updateExplicitCount('', args.dirs);
        expPrompt(vorpal.activeCommand, callback, args.dirs);
    });

vorpal
    .catch('[words...]', 'Tweet')
    .parse(Parser.parseStatus)
    .action((args, callback) => {
        let status = args.words.join(' ');
        status = Parser.postParse(status);

        if (preferences.get('tweet_protection')) {
            vorpal.activeCommand.log(Color.yellow(Color.bold('WARNING:') +
                ' You enabled tweet protection. Update status with ' +
                Color.bold('/tweet') +
                ' or disable tweet protection.')
            );
        } else if (status.charAt(0) === '/') {
            vorpal.activeCommand.prompt({
                type: 'confirm',
                name: 'protin',
                default: null,
                message: Color.yellow(`${Color.bold('WARNING:')} Do you really want to tweet this?`)
            }, result => {
                if (result.protin) {
                    api.update(status);
                }
                callback();
            });
        } else {
            api.update(status);
        }
        callback();
    });

vorpal
    .on('keypress', function (event) {
        if (this.ui.delimiter() === 'PIN: ') return;
        const explicit = this.ui.delimiter().substring(0, 5) === 'Tweet';
        if (event.key === 'tab') Autocomplete.autocomplete(this, cache);
        delimiter.set(this, store, api, this.ui.input(), explicit);
    });

const help = vorpal.find('help');
const exit = vorpal.find('exit');

if (help) help.remove();
if (exit) exit.remove();

vorpal
    .command('/exit')
    .alias('/quit')
    .description('Exits birdknife.')
    .action(args => {
        args.options = args.options || {};
        args.options.sessionId = vorpal.activeCommand.session.id;
        vorpal.activeCommand.parent.exit(args.options);
    });

vorpal
    .command('/help [command...]')
    .description('Provides help for a given command.')
    .action((args, cb) => {
        if (args.command) {
            args.command = args.command.join(' ');
            const name = _.find(vorpal.activeCommand.parent.commands, { _name: String(args.command).toLowerCase().trim() });
            if (name && !name._hidden) {
                if (_.isFunction(name._help)) {
                    name._help(args.command, str => {
                        vorpal.activeCommand.log(str);
                        cb();
                    });
                    return;
                }
                vorpal.activeCommand.log(name.helpInformation());
            } else {
                vorpal.activeCommand.log(vorpal.activeCommand.parent._commandHelp(args.command));
            }
        } else {
            vorpal.activeCommand.log(vorpal.activeCommand.parent._commandHelp(args.command));
        }
        cb();
    });

vorpal.history('birdknife');

vorpal.log(`Welcome to birdknife! (${pkg.version})`);

new Update({ pkg, updateCheckInterval: 1000 * 60 * 60 * 24 /* every day */ }).notify();

new Timer(vorpal, preferences).start();

if (preferences.checkAccessToken()) {
    vorpal.log(Color.blue('Logging in...'));
    api.login(preferences, vorpal, store, cache);
} else {
    vorpal.log(Color.green('Type /login to authenticate with Twitter.'));
}

vorpal
    .delimiter('birdknife [---]>')
    .show();
