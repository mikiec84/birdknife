var vorpal = require('vorpal')(),
    DataStore = require('nedb'),
    cache = new DataStore(),
    nconf = require('nconf'),
    colors = require('colors'),
    api = require('./TwitterAPI');

nconf.argv()
    .env()
    .file({ file: 'config.json' });

vorpal.commands = [];

vorpal
    .command('/exit', 'Exit ntwt')
    .action(function(args) {
        args.options = args.options || {};
        args.options.sessionId = this.session.id;
        this.parent.exit(args.options);
    });

vorpal
    .command('/show <id>', 'Show cached tweet by id')
    .action(function(args, callback) {
        var id = args.id || -1;
        var self = this;

        cache.findOne({ id: id }, function(err, doc) {
            if (err) return;
            self.log(doc.status);
        });
        callback();
    });

vorpal
    .command('/delete <id>', 'Delete a tweet')
    .action(function(args, callback) {
        var id = args.id || -1;
        var self = this;

        cache.findOne({ id: id }, function(err, doc) {
            if (err) {
                err = err || "not authorized";
                self.log(('Error: ' + err).red);
                return;
            }
            api.delete(doc.status);
        });
        callback();
    });

vorpal
    .command('/again', 'Reload home timeline')
    .action(function(args, callback) {
        api.loadHome();
        callback();
    });

vorpal
    .command('/replies', 'Show latest 20 mentions')
    .action(function(args, callback) {
        api.loadReplies();
        callback();
    });

vorpal
    .command('/retweet <id>', 'Retweet status with id')
    .alias('/rt')
    .action(function(args, callback) {
        cache.findOne({ id: args.id }, function(err, doc) {
            if (err) {
                self.log(('Error: ' + err).red);
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
        cache.findOne({ id: args.id }, function(err, doc) {
            if (err) {
                self.log(('Error: ' + err).red);
                return;
            }
            api.like(doc.status.id_str);
        });
        callback();
    });

vorpal
    .command('/reply <id> <text...>', 'Reply to a tweet')
    .alias('/re')
    .action(function(args, callback) {
        if (!args.id || !args.text) {
            callback();
            return;
        }
        var id = args.id;
        var text = args.text;
        var self = this;

        text = text.join(' ');

        cache.findOne({ id: id }, function(err, doc) {
            if (err) {
                self.log(('Error: ' + err).red);
                return;
            }

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
        });
        callback();
    });

vorpal
    .command('/thread <id>', 'Show Conversation')
    .action(function(args, callback) {
        var id = args.id || -1;
        var self = this;

        cache.findOne({ id: id }, function(err, doc) {
            if (err) {
                err = err || "not authorized";
                self.log(('Error: ' + err).red);
                return;
            }
            api.loadConversation(doc.status);
        });
        callback();
    });

vorpal
    .mode('/login')
    .description('Authenticate your Twitter account')
    .delimiter('PIN:')
    .init(function(args, callback) {
        var self = this;

        var TwitterPinAuth = require('twitter-pin-auth');
        twitterPinAuth = new TwitterPinAuth(
            nconf.get('auth:consumer_key'),
            nconf.get('auth:consumer_secret'));

        twitterPinAuth.requestAuthUrl()
            .then(function(url) {
                self.log("Login and copy the PIN number: ".yellow + url.underline);
            })
            .catch(function(err) {
                self.log(('Error: ' + err).red);
            });
        callback();
    })
    .action(function(arg, callback) {
        var self = this;
        twitterPinAuth.authorize(arg)
            .then(function(data) {
                nconf.set('auth:access_token', data.accessTokenKey);
                nconf.set('auth:access_token_secret', data.accessTokenSecret);

                self.log('Saving access token...'.blue);
                nconf.save();

                self.log("Authentication successfull!\n\nPlease restart ntwt!".green.bold);

                var options = {};
                options.sessionId = self.session.id;
                self.parent.exit(options);
            })
            .catch(function(err) {
                self.log('Authentication failed!'.red);
                self.log(err);
            });
        callback();
    });

vorpal
    .catch('[words...]', 'Tweet')
    .action(function(args, callback) {
        if (!args.words) return;
        var self = this;

        var status = args.words.join(' ');
        api.update(status);
        callback();
    });

vorpal.log('Welcome to ntwt!');

if (!nconf.get('auth:access_token') || !nconf.get('auth:access_token_secret')) {
    vorpal.log('Type /login to authenticate with Twitter.'.green);
} else {
    vorpal.log('Logging in...'.blue);

    api.login(nconf.get('auth:consumer_key'),
              nconf.get('auth:consumer_secret'),
              nconf.get('auth:access_token'),
              nconf.get('auth:access_token_secret'),
              vorpal, cache);
    api.startStream();
}



vorpal
    .delimiter('ntwt>')
    .show();
