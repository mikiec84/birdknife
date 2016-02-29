var Twit = require('twit'),
    ShortIdGenerator = require('./ShortIdGenerator');

module.exports = {
    T: null,
    stream: null,
    ME: null,
    PINAuth: null,
    vorpal: null,
    cache: null,
    login: function(ckey, csecret, akey, asecret, vorpal, cache) {
        this.vorpal = vorpal;
        this.cache = cache;
        this.T = new Twit({
            consumer_key:        ckey,
            consumer_secret:     csecret,
            access_token:        akey,
            access_token_secret: asecret
        });

        this.loadMyself();
    },
    startStream: function() {
        const self = this;
        this.stream = this.T.stream('user');

        this.stream.on('tweet', function(tweet) {
            self.displayStatus(tweet);
        });
    },
    loadMyself: function() {
        const self = this;
        this.T.get('account/verify_credentials', { skip_status: true })
            .catch(function(err) {
                self.vorpal.log('Error GET account/verify_credentials: ' + err);
            })
            .then(function(result) {
                self.vorpal.log("Logged in as " + result.data.screen_name);
                self.ME = result.data;

                self.loadHome();
            });
    },

    loadHome: function() {
        const self = this;
        this.T.get('statuses/home_timeline', { count: 20 })
            .catch(function(err) {
                self.vorpal.log('Error GET statuses/home_timeline: ' + err);
            })
            .then(function(result) {
                result.data.reverse().forEach(function(tweet) {
                    self.displayStatus(tweet);
                });
            });
    },

    loadReplies: function() {
        const self = this;
        this.T.get('statuses/mentions_timeline')
            .catch(function(err) {
                self.vorpal.log('Error GET statuses/mentions_timeline: ' + err);
            })
            .then(function(result) {
                result.data.reverse().forEach(function(tweet) {
                    self.displayStatus(tweet);
                });
            });
    },

    update: function(tweet) {
        const self = this;
        this.T.post('statuses/update', { status: tweet })
            .catch(function(err) {
                if (err) self.vorpal.log(err);
            });
    },

    delete: function(id) {
        const self = this;
        this.T.post('statuses/destroy/:id', { id: id })
            .catch(function(err) {
                self.vorpal.log('Error POST statuses/destroy: ' + err);
            })
            .then(function(result) {
                self.vorpal.log(('Deleted tweet with status ' + result.data.id_str).yellow);
            });
    },

    isMention: function(status) {
        for (var m in status.entities.user_mentions) {
            var mention = status.entities.user_mentions[m];
            if (mention.id == this.ME.id) return true;
        }
        return false;
    },

    displayStatus: function(status) {
        var id = ShortIdGenerator.generate();

        var doc = {
            id: id,
            status: status
        };
        this.cache.update({ id: id }, doc, { upsert: true });

        var text = status.text;

        this.vorpal.log(status.entities.urls);
        for (var u in status.entities.urls) {
            var url = status.entities.urls[u];
            var _text = text.substring(0, url.indices[0]);
            _text += url.display_url;
            _text += text.substring(url.indices[1]);
            text = _text;
        }

        for (var m in status.entities.user_mentions) {
            var mention = status.entities.user_mentions[m];
            text = text.replace(
                '@' + mention.screen_name,
                ('@' + mention.screen_name).bold
            );
        }

        var line = id + "> ";
        line += "<@";
        line += status.user.screen_name == this.ME.screen_name
            ? status.user.screen_name.underline.yellow
            : status.user.screen_name.underline.blue;
        line += ">: ";
        line += this.isMention(status) ? text.red : text;
        line += '\n';
        this.vorpal.log(line);
    }
};
