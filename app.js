var vorpal = require('vorpal')(),
    DataStore = require('nedb'),
    cache = new DataStore(),
    fs = require('fs'),
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
                self.log('Error: ' + err);
                return;
            }
            api.delete(doc.status.id_str);
        });
        callback();
    });

vorpal
    .command('/replies', 'Show latest 20 mentions')
    .action(function(args, callback) {
        api.loadReplies();
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
        if (!args.words) return;
        var self = this;

        var status = args.words.join(' ');
        api.update(status);
        callback();
    });

vorpal.log('Welcome to ntwt!');

if (!nconf.get('auth:access_token') || !nconf.get('auth:access_token_secret')) {
    vorpal.log('Type /login to authenticate with Twitter.');
} else {
    vorpal.log('Logging in...');

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
