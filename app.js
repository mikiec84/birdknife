var vorpal = require('vorpal')(),
    DataStore = require('nedb'),
    cache = new DataStore(),
    fs = require('fs'),
    nconf = require('nconf'),
    Twit = require('twit');

var T = null;
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
    .mode('/login')
    .description('Authenticate your Twitter account')
    .delimiter('Login:')
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
            vorpal.log('Error: ' + err);
        })
        .then(function(result) {
            vorpal.log("Logged in as " + result.data.screen_name);
        });

    var stream = T.stream('user');
    
    stream.on('tweet', function(tweet) {
        vorpal.log(tweet.user.screen_name + ": " + tweet.text);
    })
}



vorpal
    .delimiter('ntwt>')
    .show();
