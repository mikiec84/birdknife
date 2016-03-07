#!/usr/bin/env node

var vorpal = require('vorpal')(),
    path = require('path'),
    DataStore = require('nedb'),
    cache = new DataStore(),
    nconf = require('nconf'),
    color = require('./libs/color_definitions'),
    api = require('./libs/TwitterAPI'),
    twitter = require('twitter-text'),
    birdknife_text = require('./libs/birdknife-text'),
    parser = require('./libs/birdknife-parser'),
    fs = require('fs'),
    _ = require('lodash');

const pkg = require('./package.json'),
      update = require('update-notifier');

var configPath = path.join(process.env[(process.platform == 'win32' ? 'USERPROFILE' : 'HOME')], '.birdknife.json');

//Copy config file if needed
try {
    fs.accessSync(configPath, fs.F_OK); //config file already exists
} catch (e) {
    try {
        fs.writeFileSync(configPath,
            fs.readFileSync('./config.json')
        );
    } catch (e) {
        //Error copying file. Use config from inside the packge.
        console.log(e);
        configPath = path.join(path.dirname(require.main.filename), 'config.json');
    }
}

nconf.argv()
    .env()
    .file({ file: configPath });

vorpal.commands = [];

vorpal
    .command('/show <id>', 'Show cached tweet by id')
    .option('--debug', 'Show full tweet object')
    .action(function(args, callback) {
        var id = args.id || -1;
        const self = this;

        cache.findOne({ id: id }, function(err, doc) {
            if (doc.type !== 'status') return;
            if (err) {
                self.log(color.error('Error: ' + err));
                return;
            }
            var status = doc.status;
            if (args.options.debug) {
                self.log(status);
            } else {
                var log = '\n';
                log += '|\t' + color.bold('User: ') + status.user.name + ' (@' + status.user.screen_name + ')\n';
                log += '|\t\n';
                log += '|\t' + color.bold('Text: ') + status.text + '\n';
                log += '|\t' + color.bold('Created At: ') + status.created_at + '\n';
                log += '|\t' + color.bold('Favorites: ') + (status.favorite_count || '0') + '\n';
                log += '|\t' + color.bold('Retweets: ') + (status.retweet_count || '0') + '\n';
                if (status.place) {
                    log += '|\t' + color.bold('Location: ') + status.place.full_name + '\n';
                }
                if (status.coordinates) {
                    var coordinates = status.coordinates[0];
                    log += '|\t' + color.bold('Location (Coordinates): ') + coordinates[0] + ', ' + coordinates[1] + '\n';
                }
                log += '|\t' + color.bold('Source: ') + status.source + '\n';
                self.log(log);
            }
        });
        callback();
    });

vorpal
    .command('/delete <id>', 'Delete a tweet')
    .action(function(args, callback) {
        var id = args.id || -1;
        const self = this;

        cache.findOne({ id: id }, function(err, doc) {
            if (err) {
                self.log(color.error('Error: ' + err));
                return;
            }
            if (doc.type === 'status') {
                api.delete(doc.status);
                //TODO delete from cache?
            } else {
                self.log(color.error('Warning: Unsupported command for this element.'));
            }
        });
        callback();
    });

vorpal
    .command('/again [screen_name]', 'Reload home timeline or specified users timeline')
    .action(function(args, callback) {
        api.loadTimeline(args.screen_name);
        callback();
    });

vorpal
    .command('/dms', 'Show DMs')
    .action(function(args, callback) {
        api.loadDMs();
        callback();
    });

vorpal
    .command('/replies', 'Show latest 20 mentions')
    .action(function(args, callback) {
        api.loadReplies();
        callback();
    });

vorpal
    .command('/search <query>', 'Search')
    .action(function(args, callback) {
        api.search(args.query);
        callback();
    });

vorpal
    .command('/retweet <id>', 'Retweet status with id')
    .alias('/rt')
    .action(function(args, callback) {
        const self = this;
        cache.findOne({ id: args.id }, function(err, doc) {
            if (doc.type !== 'status') return;
            if (err) {
                self.log(color.error('Error: ' + err));
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
        cache.findOne({ id: args.id }, function(err, doc) {
            if (doc.type !== 'status') return;
            if (err) {
                self.log(color.error('Error: ' + err));
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
        cache.findOne({ id: args.id }, function(err, doc) {
            if (doc.type !== 'status') return;
            if (err) {
                self.log(color.error('Error: ' + err));
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
        if (!args.id || !args.text) {
            callback();
            return;
        }
        var id = args.id;
        var text = args.text;

        text = text.join(' ');
        text =  text.replace(/&bquot;/g, "'");

        cache.findOne({ id: id }, function(err, doc) {
            if (err) {
                self.log(color.error('Error: ' + err));
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
        if (!args.id || !args.text) {
            callback();
            return;
        }
        var id = args.id;
        var text = args.text;

        text = text.join(' ');
        text =  text.replace(/&bquot;/g, "'");

        cache.findOne({ id: id }, function(err, doc) {
            if (err) {
                self.log(color.error('Error: ' + err));
                return;
            }
            if (doc.type !== 'status') {
                self.log(color.error('Error: You can only quote tweets.'));
            }

            text += ' https://twitter.com/' + doc.status.screen_name + '/status/' + doc.status.id_str;
            api.update(text);
        });
        callback();
    });

vorpal
    .command('/thread <id>', 'Show Conversation')
    .action(function(args, callback) {
        var id = args.id || -1;
        const self = this;

        cache.findOne({ id: id }, function(err, doc) {
            if (doc.type !== 'status') return;
            if (err) {
                self.log(color.error('Error: ' + err));
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
            nconf.get('auth:consumer_key'),
            nconf.get('auth:consumer_secret'));

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
                    nconf.set('auth:access_token', data.accessTokenKey);
                    nconf.set('auth:access_token_secret', data.accessTokenSecret);

                    self.log('Saving access token...'.blue);
                    nconf.save();

                    self.log(color.success("Authentication successfull!\n\n"));

                    self.log(color.blue('Logging in...'));

                    api.login(nconf.get('auth:consumer_key'),
                        nconf.get('auth:consumer_secret'),
                        nconf.get('auth:access_token'),
                        nconf.get('auth:access_token_secret'),
                        vorpal, cache);
                    api.startStream();

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
        message = message.replace(/&bquot;/g, "'");
        api.message(screen_name, message);
        callback();
    });

vorpal
    .catch('[words...]', 'Tweet')
    .parse(parser.parseStatus)
    .action(function(args, callback) {
        var status = args.words.join(' ');
        status = status.replace(/&bquot;/g, "'");

        api.update(status);
        callback();
    });

vorpal
    .on('keypress', function(event) {
        if (this.ui.delimiter() === 'PIN: ') return;
        const self = this;

        var _c, _p;
        var p = this.ui.input();
        var pad = '000';
        var command = p.match(/^\//);
        var quote = p.match(/^\/quote\s([a-z0-9]{2})\s/);
        var reply = p.match(/^\/reply\s([a-z0-9]{2})\s/);

        var updateDelimiter = function() {
            if (_c < 0) _c = 0;

            var _s = (pad + _c).slice(-pad.length);
            if (_c <= 15) _s = color.delimiter_warning(_s);

            self.ui.delimiter('birdknife [' + _s + ']> ');
        };

        if (p.length === 0 || (command && !quote && !reply)) {
            this.ui.delimiter('birdknife [---]> ');
            return;
        } else if (reply) {
            _p = p.replace(reply[0], '');
            var id = reply[1];

            cache.findOne({ id: id }, function(err, doc) {
                if (doc.type !== 'status') return;
                if (err) {
                    self.log(color.error('Error: ' + err));
                    return;
                }

                _p = birdknife_text.addMentionsToReply(api.ME.screen_name, _p, doc.status);
                _c = 140 - twitter.getTweetLength(_p);

                updateDelimiter();
            });
        } else if (quote) {
            _p = p.replace(quote[0], '');
            var id = quote[1];

            cache.findOne({ id: id }, function(err, doc) {
                if (doc.type !== 'status') return;
                if (err) {
                    self.log(color.error('Error: ' + err));
                    return;
                }

                _p += ' https://twitter.com/' + doc.status.screen_name + '/status/' + doc.status.id_str;
                _c = 140 - twitter.getTweetLength(_p);

                updateDelimiter();
            });
        } else {
            _c = 140 - twitter.getTweetLength(p);

            updateDelimiter();
        }
    });

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

vorpal.log('Welcome to birdknife! ' + '(' + pkg.version + ')');

update({ "pkg": pkg, updateCheckInterval: 1000 * 60 * 60 * 24 /* every day */ }).notify();

if (!nconf.get('auth:access_token') || !nconf.get('auth:access_token_secret')) {
    vorpal.log(color.green('Type /login to authenticate with Twitter.'));
} else {
    vorpal.log(color.blue('Logging in...'));

    api.login(nconf.get('auth:consumer_key'),
              nconf.get('auth:consumer_secret'),
              nconf.get('auth:access_token'),
              nconf.get('auth:access_token_secret'),
              vorpal, cache);
}



vorpal
    .delimiter('birdknife [---]>')
    .show();
