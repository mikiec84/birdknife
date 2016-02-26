var vorpal = require('vorpal')(),
    DataStore = require('nedb'),
    cache = new DataStore(),
    fs = require('fs'),
    nconf = require('nconf'),
    Twit = require('twit'),
    ShortIdGenerator = require('./ShortIdGenerator'),
    colors = require('colors');

var T = null;
var ME;
var twitterPinAuth = null;

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
            if (err || !T) {
                err = err || "not authorized";
                self.log('Error: ' + err);
                return;
            }
            self.log(doc.status.id);
            T.post('statuses/destroy/:id', { id: doc.status.id_str })
                .catch(function(err) {
                    vorpal.log('Error POST statuses/destroy: ' + err);
                })
                .then(function(result) {
                    vorpal.log(('Deleted tweet with status ' + result.data.id_str).yellow);
                });
        });
        callback();
    });

vorpal
    .command('/replies', 'Show latest 20 mentions')
    .action(function(args, callback) {
        if (T) {
            T.get('statuses/mentions_timeline')
                .catch(function(err) {
                    vorpal.log('Error GET statuses/mentions_timeline: ' + err);
                })
                .then(function(result) {
                    result.data.reverse().forEach(function(tweet) {
                        displayStatus(tweet);
                    });
                });
        }
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
                self.log("Login and copy the PIN number: " + url);
            })
            .catch(function(err) {
                self.log(err);
            });
        callback();
    })
    .action(function(arg, callback) {
        var self = this;
        twitterPinAuth.authorize(arg)
            .then(function(data) {
                self.log(data.accessTokenKey);
                self.log(data.accessTokenSecret);
                nconf.set('auth:access_token', data.accessTokenKey);
                nconf.set('auth:access_token_secret', data.accessTokenSecret);

                nconf.save(function (err) {
                    fs.readFile('config.json', function (err, data) {
                        console.dir(JSON.parse(data.toString()))
                    });
                });

                self.log("Authentication successfull.\n\nPlease restart ntwt!");

                var options = {};
                options.sessionId = self.session.id;
                self.parent.exit(options);
            })
            .catch(function(err) {
                self.log('Authentication failed!');
                self.log(err);
            });
        callback();
    });

vorpal
    .catch('[words...]', 'Tweet')
    .action(function(args, callback) {
        if (!T || !args.words) return;
        var self = this;

        var status = args.words.join(' ');
        T.post('statuses/update', { status: status })
            .catch(function(err) {
                if (err) self.log(err);
            });
        callback();
    });

vorpal.log('Welcome to ntwt!');

if (!nconf.get('auth:access_token') || !nconf.get('auth:access_token_secret')) {
    vorpal.log('Type /login to authenticate with Twitter.');
} else {
    vorpal.log('Logging in...');

    T = new Twit({
        consumer_key:        nconf.get('auth:consumer_key'),
        consumer_secret:     nconf.get('auth:consumer_secret'),
        access_token:        nconf.get('auth:access_token'),
        access_token_secret: nconf.get('auth:access_token_secret')
    });

    T.get('account/verify_credentials', { skip_status: true })
        .catch(function(err) {
            vorpal.log('Error GET account/verify_credentials: ' + err);
        })
        .then(function(result) {
            vorpal.log("Logged in as " + result.data.screen_name);
            ME = result.data;
        });

    T.get('statuses/home_timeline', { count: 20 })
        .catch(function(err) {
            vorpal.log('Error GET statuses/home_timeline: ' + err);
        })
        .then(function(result) {
            result.data.reverse().forEach(function(tweet) {
                displayStatus(tweet);
            });
        });

    var stream = T.stream('user');

    stream.on('tweet', function(tweet) {
        displayStatus(tweet);
    });
}

var isMention = function(status) {
    for (var i in status.entities.user_mentions) {
        var mention = status.entities.user_mentions[i];
        if (mention.id == ME.id) return true;
    }
    return false;
};

var displayStatus = function(status) {
    var id = ShortIdGenerator.generate();

    var doc = {
        id: id,
        status: status
    };
    cache.insert(doc);

    var line = id + "> ";
    line += "<@";
    line += status.user.screen_name == ME.screen_name
        ? status.user.screen_name.underline.yellow
        : status.user.screen_name.underline.blue;
    line += ">: ";
    line += isMention(status) ? status.text.red : status.text;
    line += '\n';
    vorpal.log(line);
};

vorpal
    .delimiter('ntwt>')
    .show();
