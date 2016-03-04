#! /usr/bin/env node

var vorpal = require('vorpal')(),
    path = require('path'),
    DataStore = require('nedb'),
    cache = new DataStore(),
    nconf = require('nconf'),
    color = require('./libs/color_definitions'),
    api = require('./libs/TwitterAPI'),
    twitter = require('twitter-text'),
    parser = require('./libs/birdknife-parser');

nconf.argv()
    .env()
    .file({ file: path.join(path.dirname(require.main.filename), 'config.json') });

vorpal.commands = [];

vorpal
    .command('/exit', 'Exit birdknife')
    .action(function(args) {
        args.options = args.options || {};
        args.options.sessionId = this.session.id;
        this.parent.exit(args.options);
    });

vorpal
    .command('/show <id>', 'Show cached tweet by id')
    .option('--debug', 'Show full tweet object')
    .action(function(args, callback) {
        var id = args.id || -1;
        const self = this;

        cache.findOne({ id: id }, function(err, doc) {
            if (doc.type != 'status') return;
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
                    log += '|\t' + color.bold('Location: ') + place.full_name + '\n';
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
            if (doc.type == 'status') {
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
            if (doc.type != 'status') return;
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
            if (doc.type != 'status') return;
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
            if (doc.type != 'status') return;
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
    .command('/reply <id> <text...>', 'Reply to a tweet')
    .alias('/re')
    .parse(parser.parseReply)
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

            if (doc.type == 'status') {
                var status = doc.status;

                for (var m in status.entities.user_mentions) {
                    var mention = status.entities.user_mentions[m];
                    if (text.indexOf(mention.screen_name) < 0) {
                        if (mention.screen_name == api.ME.screen_name) continue;
                        text = '@' + mention.screen_name + ' ' + text;
                    }
                }
                if (text.indexOf(status.user.screen_name) < 0) {
                    text = '@' + status.user.screen_name + ' ' + text;
                }

                api.reply(text, status.id_str);
            } else if (doc.type == 'message') {
                api.message(doc.message.sender_screen_name, text);
            } else {
                self.log(color.error('Warning: Unsupported command for this element.'));
            }
        });
        callback();
    });

vorpal
    .command('/thread <id>', 'Show Conversation')
    .action(function(args, callback) {
        var id = args.id || -1;
        const self = this;

        cache.findOne({ id: id }, function(err, doc) {
            if (doc.type != 'status') return;
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
    .action(function(args, callback) {
        var screen_name = args.screen_name;
        var message = args.words.join(' ');
        api.message(screen_name, message);
        callback();
    });

vorpal
    .catch('[words...]', 'Tweet')
    .parse(parser.parse)
    .action(function(args, callback) {
        var status = args.words.join(' ');
        status = status.replace(/&bquot;/g, "'");

        api.update(status);
        callback();
    });

vorpal
    .on('keypress', function(event) {
        var current = this.ui.delimiter();
        if (current == 'PIN: ') return;

        var p = this.ui.input();
        if (!p || p.length == 0 || p.charAt(0) == '/') {
            this.ui.delimiter('birdknife [---]> ');
        } else {
            var pad = '000';
            var _c = 140 - twitter.getTweetLength(p);
            if (_c < 0) _c = 0;

            var _s = (pad + _c).slice(-pad.length);
            if (_c <= 15) _s = color.delimiter_warning(_s);

            this.ui.delimiter('birdknife [' + _s + ']> ');
        }
    });

vorpal.log('Welcome to birdknife!');

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
