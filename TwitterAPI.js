var Twit = require('twit'),
    ShortIdGenerator = require('./ShortIdGenerator'),
    colors = require('colors'),
    ntwt_text = require('./ntwt-text');

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

        this.stream.on('error', function(error) {
            self.vorpal.log(('Stream error: ' + error.twitterReply).red);
        });

        this.stream.on('tweet', function(tweet) {
            self.displayStatus(tweet);
        });

        this.stream.on('user_event', function(event) {
            self.displayEvent(event);
        });

    },
    loadMyself: function() {
        const self = this;
        this.T.get('account/verify_credentials', { skip_status: true })
            .catch(function(err) {
                self.vorpal.log(('Error GET account/verify_credentials: ' + err).red);
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                    return;
                }
                self.vorpal.log(("Logged in as " + result.data.screen_name.bold).green);
                self.ME = result.data;

                self.loadHome();
            });
    },

    loadTimeline: function(screen_name) {
        if (screen_name) this.loadUserTimeline(screen_name);
        else this.loadHome();
    },

    loadHome: function() {
        const self = this;
        this.T.get('statuses/home_timeline', { count: 20, include_entities: 'true' })
            .catch(function(err) {
                self.vorpal.log(('Error GET statuses/home_timeline: ' + err).red);
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                    return;
                }
                result.data.reverse().forEach(function(tweet) {
                    self.displayStatus(tweet);
                });
            });
    },

    loadUserTimeline: function(screen_name) {
        const self = this;
        this.T.get('statuses/user_timeline', { count: 50, screen_name: screen_name, include_entities: 'true'})
            .catch(function(err) {
                self.vorpal.log(('Error GET statuses/user_timeline: ' + err).red);
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                    return;
                }
                result.data.reverse().forEach(function(tweet) {
                    self.displayStatus(tweet);
                });
            });
    },

    loadReplies: function() {
        const self = this;
        this.T.get('statuses/mentions_timeline')
            .catch(function(err) {
                self.vorpal.log(('Error GET statuses/mentions_timeline: ' + err).red);
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                    return;
                }
                result.data.reverse().forEach(function(tweet) {
                    self.displayStatus(tweet);
                });
            });
    },

    search: function(query) {
        const self = this;
        query = encodeURIComponent(query);
        this.T.get('search/tweets', { q: query, count: 50 })
            .catch(function(err) {
                self.vorpal.log(('Error GET search/tweets: ' + err).red);
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                    return;
                }
                result.data.statuses.reverse().forEach(function(tweet) {
                    self.displayStatus(tweet);
                });
            });
    },
    
    loadConversationRec: function(statuses, in_reply_to_status_id) {
        const self = this;
        this.T.get('statuses/show/:id', { id: in_reply_to_status_id, include_entities: 'true' })
            .catch(function(err) {
                self.vorpal.log(('Error GET statuses/show/:id: ' + err).red);
            })
            .then(function(result) {
                if (result.data.errors) {
                    statuses = statuses.reverse(); //TODO sort by status id

                    self.displayStatus(statuses[0], false);
                    statuses.slice(1).forEach(function(status) {
                        self.displayStatus(status, true);
                    });

                    self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                    return;
                }
                statuses.push(result.data);
                if (result.data.in_reply_to_status_id_str) {
                    self.loadConversationRec(statuses, result.data.in_reply_to_status_id_str);
                } else {
                    statuses = statuses.reverse(); //TODO sort by status id

                    self.displayStatus(statuses[0], false);
                    statuses.slice(1).forEach(function(status) {
                        self.displayStatus(status, true);
                    })
                }
            });
    },

    loadConversation: function(originalStatus) {
        this.loadConversationRec([], originalStatus.id_str);
    },

    reply: function(tweet, in_reply_to_status_id) {
        const self = this;
        this.T.post('statuses/update', { status: tweet, in_reply_to_status_id: in_reply_to_status_id })
            .catch(function(err) {
                self.vorpal.log(('Error statuses/update: ' + err).red);
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                }
            });
    },

    update: function(tweet) {
        const self = this;
        this.T.post('statuses/update', { status: tweet })
            .catch(function(err) {
                self.vorpal.log(('Error statuses/update: ' + err).red);
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                }
            });
    },

    retweet: function(id) {
        const self = this;
        this.T.post('statuses/retweet/:id', { id: id })
            .catch(function(err) {
                self.vorpal.log(('Error statuses/retweet/:id: ' + err).red);
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                    return;
                }
                self.vorpal.log(('-- Retweeted status with ID ' + result.data.id_str.bold).yellow);
            });
    },

    like: function(id) {
        const self = this;
        this.T.post('favorites/create', { id: id })
            .catch(function(err) {
                self.vorpal.log(('Error favorites/create: ' + err).red);
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                    return;
                }
                self.vorpal.log(('-- Liked status with ID ' + result.data.id_str.bold).yellow);
            })
    },

    unlike: function(id) {
        const self = this;
        this.T.post('favorites/destroy', { id: id })
            .catch(function(err) {
                self.vorpal.log(('Error favorites/destroy: ' + err).red);
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                    return;
                }
                self.vorpal.log(('-- Removed like from status with ID ' + result.data.id_str.bold).yellow);
            });
    },

    follow: function(screen_name) {
        const self = this;
        this.T.post('friendships/create', { screen_name: screen_name })
            .catch(function(err) {
                self.vorpal.log(('Error friendships/create: ' + err).red);
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                    return;
                }
                self.vorpal.log(('-- Followed user: ' + ('@' + result.data.screen_name).bold).yellow);
            });
    },

    unfollow: function(screen_name) {
        const self = this;
        this.T.post('friendships/destroy', { screen_name: screen_name })
            .catch(function(err) {
                self.vorpal.log(('Error friendships/destroy: ' + err).red);
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                    return;
                }
                self.vorpal.log(('-- Unfollowed user: ' + ('@' + result.data.screen_name).bold).yellow);
            });
    },

    delete: function(status) {
        const self = this;

        if (status.user.id_str != this.ME.id_str) {
            this.vorpal.log("Can't delete status posted by another user!".red);
        }
        
        if (status.retweeted_status) {
            this.T.post('statuses/unretweet/:id', { id: status.id_str })
                .catch(function(err) {
                    self.vorpal.log(('Error POST statuses/unretweet/:id: ' + err).red);
                })
                .then(function(result) {
                    if (result.data.errors) {
                        self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                        return;
                    }
                    self.vorpal.log(('Deleted retweet of status ' + result.data.id_str.bold).yellow);
                });
        }
        else {
            this.T.post('statuses/destroy/:id', { id: status.id_str })
                .catch(function(err) {
                    self.vorpal.log(('Error POST statuses/destroy/:id: ' + err).red);
                })
                .then(function(result) {
                    if (result.data.errors) {
                        self.vorpal.log(('Error: ' + result.data.errors[0].message).red);
                        return;
                    }
                    self.vorpal.log(('Deleted status ' + result.data.id_str.bold).yellow);
                });
        }
    },

    isMention: function(status) {
        for (var m in status.entities.user_mentions) {
            var mention = status.entities.user_mentions[m];
            if (mention.id_str == this.ME.id_str) return true;
        }
        return false;
    },

    displayEvent: function(event) {
        if (event.source.id_str == this.ME.id_str) return;
        var line = '';
        var status = null;
        switch (event.event) {
            case 'favorite':
                line += ('@' + event.source.screen_name).bold;
                line += ' liked your tweet: ';
                line += '"' + ntwt_text.autoBoldEntities(event.target_object) + '"';
                break;
            case 'follow':
                line += ('@' + event.source.screen_name).bold;
                line += ' started following you.';
                break;
            case 'quoted_tweet':
                line += ('@' + event.source.screen_name).bold;
                line += ' quoted your tweet: ';
                status = event.target_object;
                break;
            default:
                this.vorpal.log(event.source.screen_name + ' "' + event.event + '" ' + event.target.screen_name);
                break;
        }
        this.vorpal.log(line);
        if (status) this.displayStatus(status, true);
    },

    displayStatus: function(status, indented) {
        var id = ShortIdGenerator.generate();

        var doc = {
            id: id,
            status: status
        };
        this.cache.update({ id: id }, doc, { upsert: true });

        var isRetweet = status.retweeted_status ? true : false;

        var text = ntwt_text.autoBoldEntities(status);
        
        if (isRetweet) {
            text = "RT " + ("@" + status.retweeted_status.user.screen_name + ": ").bold + text;
        }

        if (this.isMention(status)) text = text.red;
        else if (indented) text = text.green;

        var line = id + "> ";
        if (indented) line += "|\t";
        line += "<";
        if (indented) line += "↑";
        line += "@";
        line += status.user.screen_name == this.ME.screen_name
            ? status.user.screen_name.underline.yellow
            : status.user.screen_name.underline.blue;
        line += ">: ";
        line += indented ? text.replace(/(?:\r\n|\r|\n)/g, '\n\t') : text;
        line += '\n';
        this.vorpal.log(line);

        if (status.quoted_status) {
            this.displayStatus(status.quoted_status, true);
        }
    }
};
