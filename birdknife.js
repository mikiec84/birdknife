#!/usr/bin/env node

var vorpal = require('vorpal')(),
    DataStore = require('nedb'),
    store = new DataStore(),
    color = require('./libs/color_definitions'),
    api = require('./libs/TwitterAPI'),
    birdknife_delimiter = require('./libs/birdknife-delimiter'),
    birdknife_text = require('./libs/birdknife-text'),
    autocompleter = require('./libs/birdknife-autocompletion'),
    parser = require('./libs/birdknife-parser'),
    preferences = require('./libs/birdknife-preferences'),
    timer = require('./libs/birdknife-timer'),
    _ = require('lodash');

const pkg = require('./package.json'),
      update = require('update-notifier');

preferences.init();

var cache = {};
cache.usernames = new DataStore({
    filename: 'usernames.db',
    autoload: true
});
cache.hashtags = new DataStore({
    filename: 'hashtags.db',
    autoload: true
});

cache.usernames.ensureIndex({ fieldName: 'k', unique: true}, function(error) {
    if (error) vorpal.log(color.error('Database error: ' + error));
});

cache.hashtags.ensureIndex({ fieldName: 'k', unique: true}, function(error) {
    if (error) vorpal.log(color.error('Database error: ' + error));
});

vorpal
    .command('/show <id>', 'Show stored tweet by id')
    .option('--debug', 'Show full tweet object')
    .action(function(args, callback) {
        const self = this;

        store.findOne({ id: args.id }, function(err, doc) {
            if (err) {
                self.log(color.error('Error: ' + err));
                callback();
                return;
            }
            if (!doc) {
                self.log(color.error('Warning: No status found with this id.'));
                callback();
                return;
            }

            var obj = doc.status ? doc.status : doc.message;
            if (args.options.debug || doc.type === 'message') {
                self.log(obj);
            } else {
                var log = '\n';
                log += '|\t' + color.bold('User: ') + obj.user.name + ' (@' + obj.user.screen_name + ')\n';
                log += '|\t\n';
                log += '|\t' + color.bold('Text: ') + obj.text + '\n';
                log += '|\t' + color.bold('Created At: ') + obj.created_at + '\n';
                log += '|\t' + color.bold('Favorites: ') + (obj.favorite_count || '0') + '\n';
                log += '|\t' + color.bold('Retweets: ') + (obj.retweet_count || '0') + '\n';
                if (obj.place) {
                    log += '|\t' + color.bold('Location: ') + obj.place.full_name + '\n';
                }
                if (obj.coordinates) {
                    var coordinates = obj.coordinates.coordinates;
                    log += '|\t' + color.bold('Location (Coordinates): ') + coordinates[0] + ', ' + coordinates[1] + '\n';
                }
                log += '|\t' + color.bold('Source: ') + obj.source + '\n';
                self.log(log);
            }
            callback();
        });
    });

vorpal
    .command('/delete <id>', 'Delete a tweet')
    .alias('/del')
    .action(function(args, callback) {
        const self = this;

        store.findOne({ id: args.id }, function(err, doc) {
            if (err) {
                self.log(color.error('Error: ' + err));
                callback();
                return;
            }
            if (!doc || doc.type !== 'status') {
                self.log(color.error('Warning: No status found with this id.'));
                callback();
                return;
            }

            api.delete(doc.status, callback);
        });
    });

vorpal
    .command('/again [screen_name]', 'Reload home timeline or specified users timeline')
    .action(function(args, callback) {
        this.log(color.blue('-- Loading tweets...'));
        api.loadTimeline(args.screen_name);
        callback();
    });

vorpal
    .command('/dms', 'Show DMs')
    .action(function(args, callback) {
        this.log(color.blue('-- Loading DMs...'));
        api.loadDMs();
        callback();
    });

vorpal
    .command('/replies', 'Show latest 20 mentions')
    .action(function(args, callback) {
        this.log(color.blue('-- Loading replies...'));
        api.loadReplies();
        callback();
    });

vorpal
    .command('/search <query>', 'Search')
    .alias('/se')
    .action(function(args, callback) {
        this.log(color.blue('-- Searching...'));
        api.search(args.query);
        callback();
    });

vorpal
    .command('/retweet <id>', 'Retweet status with id')
    .alias('/rt')
    .action(function(args, callback) {
        const self = this;
        store.findOne({ id: args.id }, function(err, doc) {
            if (err) {
                self.log(color.error('Error: ' + err));
                return;
            }
            if (!doc || doc.type !== 'status') {
                self.log(color.error('Warning: No status found with this id.'));
                return;
            }

            api.retweet(doc.status.id_str);
        });
        callback();
    });

vorpal
    .command('/like <id>', 'Like/Favorite status with id')
    .alias('/fav')
    .action(function(args, callback) {
        const self = this;
        store.findOne({ id: args.id }, function(err, doc) {
            if (err) {
                self.log(color.error('Error: ' + err));
                return;
            }
            if (!doc || doc.type !== 'status') {
                self.log(color.error('Warning: No status found with this id.'));
                return;
            }

            api.like(doc.status.id_str);
        });
        callback();
    });

vorpal
    .command('/unlike <id>', 'Remove like/favorite from status with id')
    .alias('/unfav')
    .action(function(args, callback) {
        const self = this;
        store.findOne({ id: args.id }, function(err, doc) {
            if (err) {
                self.log(color.error('Error: ' + err));
                return;
            }
            if (!doc || doc.type !== 'status') {
                self.log(color.error('Warning: No status found with this id.'));
                return;
            }

            api.unlike(doc.status.id_str);
        });
        callback();
    });

vorpal
    .command('/follow <screen_name>', 'Follow user with given name')
    .action(function(args, callback) {
        api.follow(args.screen_name);
        callback();
    });

vorpal
    .command('/unfollow <screen_name>', 'Unfollow user with given name')
    .action(function(args, callback) {
        api.unfollow(args.screen_name);
        callback();
    });

vorpal
    .command('/block <screen_name>', 'Block user with given name')
    .action(function(args, callback) {
        api.block(args.screen_name);
        callback();
    });

vorpal
    .command('/unblock <screen_name>', 'Unblock user with given name')
    .action(function(args, callback) {
        api.unblock(args.screen_name);
        callback();
    });

vorpal
    .command('/mute <screen_name>', 'Mute user with given name')
    .action(function(args, callback) {
        api.mute(args.screen_name);
        callback();
    });

vorpal
    .command('/unmute <screen_name>', 'Unmute user with given name')
    .action(function(args, callback) {
        api.unmute(args.screen_name);
        callback();
    });

vorpal
    .command('/reply <id> <text...>', 'Reply to a tweet')
    .alias('/re')
    .parse(parser.parseCommand)
    .action(function(args, callback) {
        const self = this;

        var text = args.text.join(' ');
        text = parser.postParse(text);

        store.findOne({ id: args.id }, function(err, doc) {
            if (err) {
                self.log(color.error('Error: ' + err));
                return;
            }
            if (!doc) {
                self.log(color.error('Warning: No status or message found with this id.'));
                return;
            }

            if (doc.type === 'status') {
                text = birdknife_text.addMentionsToReply(api.ME.screen_name, text, doc.status);
                api.reply(text, doc.status.id_str);
            } else if (doc.type === 'message') {
                api.message(doc.message.sender_screen_name, text);
            } else {
                self.log(color.error('Warning: Unsupported command for this element.'));
            }
        });
        callback();
    });

vorpal
    .command('/quote <id> <text...>', 'Quote a tweet')
    .parse(parser.parseCommand)
    .action(function(args, callback) {
        const self = this;

        var text = args.text.join(' ');
        text = parser.postParse(text);

        store.findOne({ id: args.id }, function(err, doc) {
            if (err) {
                self.log(color.error('Error: ' + err));
                return;
            }
            if (!doc || doc.type !== 'status') {
                self.log(color.error('Warning: No status found with this id.'));
                return;
            }

            text += ' https://twitter.com/' + doc.status.screen_name + '/status/' + doc.status.id_str;
            api.update(text);
        });
        callback();
    });

vorpal
    .command('/thread <id>', 'Show Conversation')
    .action(function(args, callback) {
        const self = this;

        this.log(color.blue('-- Loading conversation. This might take a few seconds...'));

        store.findOne({ id: args.id }, function(err, doc) {
            if (err) {
                self.log(color.error('Error: ' + err));
                return;
            }
            if (!doc || doc.type !== 'status') {
                self.log(color.error('Warning: No status found with this id.'));
                return;
            }

            api.loadConversation(doc.status);
        });
        callback();
    });

vorpal
    .command('/login')
    .description('Authenticate with your Twitter account')
    .action(function(arg, callback) {
        const self = this;

        var TwitterPinAuth = require('twitter-pin-auth');
        twitterPinAuth = new TwitterPinAuth(
            preferences.get('auth:consumer_key'),
            preferences.get('auth:consumer_secret'));

        twitterPinAuth.requestAuthUrl()
            .then(function(url) {
                self.log(color.yellow("Login and copy the PIN number: ") + color.url(url));
            })
            .catch(function(err) {
                self.log(color.error('Error: ' + err));
            });

        this.prompt({
            type: 'input',
            name: 'pin',
            default: null,
            message: 'PIN: '
        }, function(result) {
            if (!result.pin) return;
            twitterPinAuth.authorize(result.pin)
                .then(function(data) {
                    preferences.set('auth:access_token', data.accessTokenKey);
                    preferences.set('auth:access_token_secret', data.accessTokenSecret);

                    self.log(color.success("\nAuthentication successful!\n"));

                    self.log(color.blue('Logging in...'));

                    api.login(preferences, vorpal, store, cache);

                    callback();
                })
                .catch(function(err) {
                    self.log(color.error('Authentication failed!'));
                    self.log(err);
                    callback();
                });
        });
    });

vorpal
    .command('/user <screen_name>')
    .description('Display user information')
    .action(function(args, callback) {
        this.log(color.blue('-- Loading user information...'));
        api.loadUser(args.screen_name);
        callback();
    });

vorpal
    .command('/dm <screen_name> <words...>]')
    .description('Send direct message')
    .parse(parser.parseCommand)
    .action(function(args, callback) {
        var screen_name = args.screen_name;
        var message = args.words.join(' ');
        message = parser.postParse(message);
        api.message(screen_name, message);
        callback();
    });

vorpal
    .command('/preferences', 'List all preferences')
    .action(function(args, callback) {
        var columnify = require('columnify');
        var pref = preferences.get('preferences');

        var data = {};
        for (var k in pref) {
            data[k] = color.blue(JSON.stringify(pref[k]));
        }
        this.log('\n' + columnify(data)+ '\n');
        callback();
    });

vorpal
    .command('/set <key> <value>', 'Set preference by key')
    .parse(parser.parseCommand)
    .action(function(args, callback) {
        var value = typeof args.value === 'string'
            ? parser.postParse(args.value)
            : args.value;
        try {
            value = JSON.parse(value);
        } catch (e) {
        }

        if (preferences.set('preferences:' + args.key, value)) {
            this.log(color.blue(args.key + ' is now set to ' + preferences.get('preferences:' + args.key)));
        } else {
            this.log(color.error('Error: ' + args.key + ' is not a valid key!'))
        }
        callback();
    });

vorpal
    .command('/tweet', 'Tweet')
    .action(function(args, callback) {
        this.prompt({
            type: 'input',
            name: 'tweet',
            default: null,
            message: 'Tweet [140]: '
        }, function(result) {
            if (result.tweet) {
                api.update(result.tweet);
            }
            callback();
        });
    });

vorpal
    .catch('[words...]', 'Tweet')
    .parse(parser.parseStatus)
    .action(function(args, callback) {
        var status = args.words.join(' ');
        status = parser.postParse(status);

        var protectUpdate = preferences.get('preferences:tweet_protection');
        
        if (!protectUpdate && status.charAt(0) != '/') {
            api.update(status);
        }
        else if (!protectUpdate && status.charAt(0) == '/') {
            this.prompt({
                type: 'confirm',
                name: 'protin',
                default: null,
                message: color.yellow(color.bold('WARNING:')
                    + ' Do you really want to tweet this?')
            }, function(result) {
                if (result.protin) {
                    api.update(status);
                }
                callback();
            });
            return;
        }
        else if (protectUpdate) {
            this.log(color.yellow(color.bold('WARNING:')
                + ' You enabled tweet protection. Update status with '
                + color.bold('/tweet')
                + ' or disable tweet protection.'))
        }
        callback();
    });

vorpal
    .on('keypress', function(event) {
        if (this.ui.delimiter() === 'PIN: ') return;
        var explicit = this.ui.delimiter().substring(0, 5) === 'Tweet';
        if (event.key === 'tab') autocompleter.autocomplete(this, cache);
        birdknife_delimiter.set(this, store, api, this.ui.input(), explicit);
    });


var help = vorpal.find('help'); if (help) help.remove();
var exit = vorpal.find('exit'); if (exit) exit.remove();

vorpal.command('/exit').alias('/quit').description('Exits birdknife.').action(function (args) {
    args.options = args.options || {};
    args.options.sessionId = this.session.id;
    this.parent.exit(args.options);
});

vorpal.command('/help [command...]').description('Provides help for a given command.').action(function (args, cb) {
    var self = this;
    if (args.command) {
        args.command = args.command.join(' ');
        var name = _.find(this.parent.commands, { _name: String(args.command).toLowerCase().trim() });
        if (name && !name._hidden) {
            if (_.isFunction(name._help)) {
                name._help(args.command, function (str) {
                    self.log(str);
                    cb();
                });
                return;
            }
            this.log(name.helpInformation());
        } else {
            this.log(this.parent._commandHelp(args.command));
        }
    } else {
        this.log(this.parent._commandHelp(args.command));
    }
    cb();
});

vorpal.history('birdknife');

vorpal.log('Welcome to birdknife! (' + pkg.version + ')');

update({ "pkg": pkg, updateCheckInterval: 1000 * 60 * 60 * 24 /* every day */ }).notify();

timer.start(vorpal);

if (!preferences.get('auth:access_token') || !preferences.get('auth:access_token_secret')) {
    vorpal.log(color.green('Type /login to authenticate with Twitter.'));
} else {
    vorpal.log(color.blue('Logging in...'));
    api.login(preferences, vorpal, store, cache);
}


vorpal
    .delimiter('birdknife [---]>')
    .show();
