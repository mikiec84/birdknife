var Twit = require('twit'),
    ShortIdGenerator = require('./ShortIdGenerator'),
    color = require('./color_definitions'),
    birdknife_text = require('./birdknife-text');

module.exports = {
    T: null,
    stream: null,
    ME: null,
    PINAuth: null,
    vorpal: null,
    cache: null,
    login: function(ckey, csecret, akey, asecret, vorpal, cache) {
        const self = this;
        this.vorpal = vorpal;
        this.cache = cache;
        this.T = new Twit({
            consumer_key:        ckey,
            consumer_secret:     csecret,
            access_token:        akey,
            access_token_secret: asecret
        });

        this.loadMyself();

        if (process.env.NODE_ENV != 'test') {
            setTimeout(function() {
                self.startStream();
                self.loadHome();
            }, 5000);
        }
    },
    startStream: function() {
        if (!this.T) return;
        const self = this;

        this.vorpal.log(color.blue('Starting Stream...'));

        this.stream = this.T.stream('user');

        this.stream.on('error', function(error) {
            self.vorpal.log(color.error('Stream error: ' + error.twitterReply));
        });

        this.stream.on('tweet', function(tweet) {
            self.displayStatus(tweet);
        });

        this.stream.on('direct_message', function(message) {
            if (message.direct_message.recipient_screen_name != self.ME.screen_name) return;
            self.displayDM(message.direct_message);
        });

        this.stream.on('user_event', function(event) {
            self.displayEvent(event);
        });

    },
    loadMyself: function() {
        if (!this.T) return;
        const self = this;
        this.T.get('account/verify_credentials', { skip_status: true })
            .catch(function(err) {
                self.vorpal.log(color.error('Error GET account/verify_credentials: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                    return;
                }
                self.vorpal.log(color.success("Logged in as " + color.bold(result.data.screen_name)));
                self.ME = result.data;
            });
    },

    loadTimeline: function(screen_name) {
        if (screen_name) this.loadUserTimeline(screen_name);
        else this.loadHome();
    },

    loadHome: function() {
        if (!this.T) return;
        const self = this;
        this.T.get('statuses/home_timeline', { count: 20, include_entities: 'true' })
            .catch(function(err) {
                self.vorpal.log(color.error('Error GET statuses/home_timeline: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                    return;
                }
                result.data.reverse().forEach(function(tweet) {
                    self.displayStatus(tweet);
                });
            });
    },

    loadUserTimeline: function(screen_name) {
        if (!this.T) return;
        const self = this;
        this.T.get('statuses/user_timeline', { count: 50, screen_name: screen_name, include_entities: 'true'})
            .catch(function(err) {
                self.vorpal.log(color.error('Error GET statuses/user_timeline: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                    return;
                }
                result.data.reverse().forEach(function(tweet) {
                    self.displayStatus(tweet);
                });
            });
    },

    loadReplies: function() {
        if (!this.T) return;
        const self = this;
        this.T.get('statuses/mentions_timeline')
            .catch(function(err) {
                self.vorpal.log(color.error('Error GET statuses/mentions_timeline: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                    return;
                }
                result.data.reverse().forEach(function(tweet) {
                    self.displayStatus(tweet);
                });
            });
    },

    loadDMs: function() {
        if (!this.T) return;
        const self = this;
        this.T.get('direct_messages')
            .catch(function(err) {
                self.vorpal.log(color.error('Error GET direct_messages: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                    return;
                }
                result.data.reverse().forEach(function(message) {
                    self.displayDM(message);
                });
            });
    },

    loadUser: function(screen_name) {
        if (!this.T) return;
        const self = this;
        this.T.get('users/show', { screen_name: screen_name })
            .catch(function(err) {
                self.vorpal.log(color.error('Error GET users/show: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                    return;
                }

                self.T.get('friendships/show', { source_id: self.ME.id_str, target_id: result.data.id_str })
                    .catch(function(err) {
                        self.vorpal.log(color.error('Error GET users/show: ' + err));
                    })
                    .then(function(result2) {
                        self.displayUser(result.data, result2.data.relationship);
                    });
            });
    },

    search: function(query) {
        if (!this.T) return;
        const self = this;
        query = encodeURIComponent(query);
        this.T.get('search/tweets', { q: query, count: 50 })
            .catch(function(err) {
                self.vorpal.log(color.error('Error GET search/tweets: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                    return;
                }
                result.data.statuses.reverse().forEach(function(tweet) {
                    self.displayStatus(tweet);
                });
            });
    },
    
    loadConversationRec: function(statuses, in_reply_to_status_id) {
        if (!this.T) return;
        const self = this;
        this.T.get('statuses/show/:id', { id: in_reply_to_status_id, include_entities: 'true' })
            .catch(function(err) {
                self.vorpal.log(color.error('Error GET statuses/show/:id: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    statuses = statuses.reverse(); //TODO sort by status id

                    self.displayStatus(statuses[0], false);
                    statuses.slice(1).forEach(function(status) {
                        self.displayStatus(status, true);
                    });

                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
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
        if (!this.T) return;
        const self = this;
        this.T.post('statuses/update', { status: tweet, in_reply_to_status_id: in_reply_to_status_id })
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST statuses/update: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                }
            });
    },

    update: function(tweet) {
        if (!this.T) return;
        const self = this;
        this.T.post('statuses/update', { status: tweet })
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST statuses/update: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                }
            });
    },

    message: function(screen_name, message) {
        if (!this.T) return;
        const self = this;
        this.T.post('direct_messages/new', { screen_name: screen_name, text: message })
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST direct_messages/new: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                }
            });
    },

    retweet: function(id) {
        if (!this.T) return;
        const self = this;
        this.T.post('statuses/retweet/:id', { id: id })
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST statuses/retweet/:id: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                    return;
                }
                self.vorpal.log(color.event('-- Retweeted status with ID ' + color.bold(result.data.id_str)));
            });
    },

    like: function(id) {
        if (!this.T) return;
        const self = this;
        this.T.post('favorites/create', { id: id })
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST favorites/create: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                    return;
                }
                self.vorpal.log(color.event('-- Liked status with ID ' + color.bold(result.data.id_str)));
            })
    },

    unlike: function(id) {
        if (!this.T) return;
        const self = this;
        this.T.post('favorites/destroy', { id: id })
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST favorites/destroy: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                    return;
                }
                self.vorpal.log(color.event('-- Removed like from status with ID ' + color.bold(result.data.id_str)));
            });
    },

    follow: function(screen_name) {
        if (!this.T) return;
        const self = this;
        this.T.post('friendships/create', { screen_name: screen_name })
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST friendships/create: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                    return;
                }
                self.vorpal.log(color.event('-- Followed user: ' + color.bold('@' + result.data.screen_name)));
            });
    },

    unfollow: function(screen_name) {
        if (!this.T) return;
        const self = this;
        this.T.post('friendships/destroy', { screen_name: screen_name })
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST friendships/destroy: ' + err));
            })
            .then(function(result) {
                if (result.data.errors) {
                    self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                    return;
                }
                self.vorpal.log(color.event('-- Unfollowed user: ' + color.bold('@' + result.data.screen_name)));
            });
    },

    delete: function(status) {
        if (!this.T) return;
        const self = this;

        if (status.user.id_str != this.ME.id_str) {
            this.vorpal.log(color.error("Can't delete status posted by another user!"));
        }
        
        if (status.retweeted_status) {
            this.T.post('statuses/unretweet/:id', { id: status.id_str })
                .catch(function(err) {
                    self.vorpal.log(color.error('Error POST statuses/unretweet/:id: ' + err));
                })
                .then(function(result) {
                    if (result.data.errors) {
                        self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                        return;
                    }
                    self.vorpal.log(color.event('Deleted retweet of status ' + color.bold(result.data.id_str)));
                });
        }
        else {
            this.T.post('statuses/destroy/:id', { id: status.id_str })
                .catch(function(err) {
                    self.vorpal.log(color.error('Error POST statuses/destroy/:id: ' + err));
                })
                .then(function(result) {
                    if (result.data.errors) {
                        self.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
                        return;
                    }
                    self.vorpal.log(color.event('Deleted status ' + color.bold(result.data.id_str)));
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
        var line = '-- ';
        var status = null;
        switch (event.event) {
            case 'favorite':
                line += color.bold('@' + event.source.screen_name);
                line += ' liked your tweet: ';
                line += '"' + birdknife_text.autoBoldStatusEntities(event.target_object) + '"';
                break;
            case 'follow':
                line += color.bold('@' + event.source.screen_name);
                line += ' started following you.';
                break;
            case 'quoted_tweet':
                line += color.bold('@' + event.source.screen_name);
                line += ' quoted your tweet: ';
                status = event.target_object;
                break;
            default:
                this.vorpal.log(color.unknown_event(event.source.screen_name + ' "' + event.event + '" ' + event.target.screen_name));
                break;
        }
        line += '\n';
        this.vorpal.log(color.event(line));
        if (status) this.displayStatus(status, true);
    },

    displayUser: function(user, relationship) {
        var bio = birdknife_text.autoBoldBioEntities(user);

        var line = '\n';
        line += '|\t' + color.bold('Name: ') + user.name + ' (@' + user.screen_name + ')\n';
        line += '|\t' + color.bold('Created At: ') + user.created_at + '\n';
        line += '|\t' + color.bold('Follower: ') + user.followers_count
            + '\t' + color.bold('Following: ') + user.friends_count + '\n';
        line += '|\t' + color.bold('Tweets: ') + user.statuses_count + '\n';
        line += '|\n';
        line += '|\t' + color.bold('URL: ') + (user.entities.url ? user.entities.url.urls[0].expanded_url : user.url) + '\n';
        line += '|\t' + color.bold('Location: ') + user.location + '\n';
        line += '|\n';
        line += '|\t' + color.bold('----------------------- Bio -----------------------') + '\n';
        line += birdknife_text.formatUserBio(user);
        line += '|\t' + color.bold('---------------------------------------------------') + '\n';
        line += '|\n';
        if (user.id_str == this.ME.id_str) {
            line += '|\t' + color.bold('This is you.');
        }

        if (relationship.target.following && relationship.target.followed_by) {
            line += '|\t' + color.bold('You are friends with this user.');
        } else if (relationship.target.following) {
            line += '|\t' + color.bold('This user is following you.');
        } else if (relationship.target.followed_by) {
            line += '|\t' + color.bold('You are following this user.');
        }
        
        line += '\n';

        this.vorpal.log(line);
    },

    displayDM: function(message) {
        var id = ShortIdGenerator.generateSpecial('d');

        var doc = {
            id: id,
            type: 'message',
            message: message
        };
        this.cache.update({ id: id }, doc, { upsert: true });

        var line = id + '> ';
        line += color.bold('[@' + message.sender_screen_name + ' | ' + message.created_at + ']: ');
        line += message.text;
        line += '\n';
        
        this.vorpal.log(color.dm(line));
    },

    displayStatus: function(status, indented) {
        var id = ShortIdGenerator.generate();

        var doc = {
            id: id,
            type: 'status',
            status: status
        };
        this.cache.update({ id: id }, doc, { upsert: true });

        var isRetweet = status.retweeted_status ? true : false;

        var text = birdknife_text.autoBoldStatusEntities(status);
        
        if (isRetweet) {
            text = "RT " + color.bold("@" + status.retweeted_status.user.screen_name + ": ") + text;
        }

        if (this.isMention(status)) text = color.reply(text);
        else if (indented) text = color.indented(text);

        var line = id + "> ";
        if (indented) line += "|\t";
        line += "<";
        if (indented) line += "↑";
        line += "@";
        line += status.user.screen_name == this.ME.screen_name
            ? color.my_screen_name(status.user.screen_name)
            : color.screen_name(status.user.screen_name);
        line += ">: ";
        line += indented ? text.replace(/(?:\r\n|\r|\n)/g, '\n\t') : text;
        line += '\n';
        this.vorpal.log(line);

        if (status.quoted_status) {
            this.displayStatus(status.quoted_status, true);
        }
    }
};
