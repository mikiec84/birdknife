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
        this.T.get('statuses/home_timeline', { count: 50 })
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
    
    loadConversationRec: function(statuses, in_reply_to_status_id) {
        const self = this;
        this.T.get('statuses/show/:id', { id: in_reply_to_status_id })
            .catch(function(err) {
                self.vorpal.log('Error GET statuses/show/:id: ' + err);
            })
            .then(function(result) {
                statuses.push(result.data);
                if (result.data.in_reply_to_status_id_str) {
                    self.loadConversationRec(statuses, result.data.in_reply_to_status_id_str);
                } else {
                    statuses.reverse().forEach(function(status) {
                        self.displayStatus(status);
                    })
                }
            });
    },

    loadConversation: function(originalStatus) {
        const self = this;
        this.loadConversationRec([], originalStatus.id_str);
    },

    reply: function(tweet, in_reply_to_status_id) {
        const self = this;
        this.T.post('statuses/update', { status: tweet, in_reply_to_status_id: in_reply_to_status_id })
            .catch(function(err) {
                if (err) self.vorpal.log(err);
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
            if (mention.id_str == this.ME.id_str) return true;
        }
        return false;
    },

    displayStatus: function(status, quote) {
        var id = ShortIdGenerator.generate();

        var doc = {
            id: id,
            status: status
        };
        this.cache.update({ id: id }, doc, { upsert: true });

        var isRetweet = status.retweeted_status ? true : false;

        var text = isRetweet ? status.retweeted_status.text : status.text;
        var entities = isRetweet ? status.retweeted_status.entities : status.entities;

        for (var u in entities.urls) {
            var url = entities.urls[u];
            var _text = text.substring(0, url.indices[0]);
            _text += url.expanded_url;
            _text += text.substring(url.indices[1]);
            text = _text;
        }

        for (var m in entities.user_mentions) {
            var mention = entities.user_mentions[m];
            text = text.replace(
                '@' + mention.screen_name,
                ('@' + mention.screen_name).bold
            );
        }
        
        if (isRetweet) {
            text = "RT " + ("@" + status.retweeted_status.user.screen_name + ": ").bold + text;
        }

        if (this.isMention(status)) text = text.red;
        else if (quote) text = text.green;

        var line = id + "> ";
        if (quote) line += "\t";
        line += "<";
        if (quote) line += "↑";
        line += "@";
        line += status.user.screen_name == this.ME.screen_name
            ? status.user.screen_name.underline.yellow
            : status.user.screen_name.underline.blue;
        line += ">: ";
        line += text;
        line += '\n';
        this.vorpal.log(line);

        if (status.quoted_status) {
            this.displayStatus(status.quoted_status, true);
        }
    }
};
