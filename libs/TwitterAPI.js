var Twit = require('twit'),
    ShortIdGenerator = require('./ShortIdGenerator'),
    color = require('./color_definitions'),
    birdknife_text = require('./birdknife-text'),
    notifier = require('node-notifier'),
    locator = require('./birdknife-locator'),
    fs = require('fs');

module.exports = {
    T: null,
    stream: null,
    ME: null,
    PINAuth: null,
    vorpal: null,
    store: null,
    cache: null,
    preferences: null,
    TEST: process.env.NODE_ENV == 'test',
    logout: function() {
        this.stream.stop();
        this.T = null;
        this.ME = null;
        this.preferences.removeAccessToken();
    },
    login: function(preferences, vorpal, store, cache) {
        const self = this;
        this.vorpal = vorpal;
        this.store = store;
        this.cache = cache;
        this.preferences = preferences;
        this.T = new Twit({
            consumer_key:        preferences.getAuth('consumer_key'),
            consumer_secret:     preferences.getAuth('consumer_secret'),
            access_token:        preferences.getAuth('access_token'),
            access_token_secret: preferences.getAuth('access_token_secret')
        });

        this.loadMyself();

        if (!this.TEST) {
            setTimeout(function() {
                self.startStream();
                self.loadHome();
            }, 3000);
        }
    },
    startStream: function() {
        if (!this.T) return;
        const self = this;

        this.vorpal.log(color.blue('Starting Stream...\n'));

        this.stream = this.T.stream('user');

        this.stream.on('error', function(error) {
            self.vorpal.log(color.error('Stream error: ' + error.twitterReply));
            self.vorpal.log(error);
        });

        this.stream.on('tweet', function(status) {
            self.displayStatus(status);

            if (self.isMention(status)) {
                if (self.preferences.get('notifications')) notifier.notify({
                    'title': '@' + status.user.screen_name,
                    'message': status.text
                });
            }
        });

        this.stream.on('direct_message', function(message) {
            self.displayDM(message.direct_message);

            if (self.preferences.get('notifications')) notifier.notify({
                'title': "Message from @" + message.sender_screen_name,
                'message': message.text
            });
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
                if (self.isError(result)) return;
                if (!self.TEST) self.vorpal.log(color.success("Logged in as " + color.bold(result.data.screen_name)));
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
                if (self.isError(result)) return;
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
                if (self.isError(result)) return;
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
                if (self.isError(result)) return;
                result.data.reverse().forEach(function(tweet) {
                    self.displayStatus(tweet);
                });
            });
    },

    loadDMs: function() {
        if (!this.T) return;
        const self = this;
        this.T.get('direct_messages', { full_text: true })
            .catch(function(err) {
                self.vorpal.log(color.error('Error GET direct_messages: ' + err));
            })
            .then(function(result) {
                if (self.isError(result)) return;
                result.data.reverse().forEach(function(message) {
                    self.displayDM(message);
                });
            });
    },

    loadSentDMs: function() {
        if (!this.T) return;
        const self = this;
        this.T.get('direct_messages/sent', { full_text: true })
            .catch(function(err) {
                self.vorpal.log(color.error('Error GET direct_messages/sent: ' + err));
            })
            .then(function(result) {
                if (self.isError(result)) return;
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
                if (self.isError(result)) return;
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
                if (self.isError(result)) return;
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
                if (!result || result.resp === null) {
                    self.vorpal.log(color.error('No result! Please check your internet connection and relogin...'));
                    return;
                }
                if (result.data.errors) {
                    statuses = statuses.reverse();

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
                    statuses = statuses.reverse();

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

        var params = {};
        params.status = tweet;
        params.in_reply_to_status_id = in_reply_to_status_id;

        var location = locator.getLocation(this.preferences);
        if (location) {
            this.vorpal.log(color.yellow('-- Reply with location: ' + location.lat + ', ' + location.lng));
            params.lat = location.lat;
            params.long = location.lng;
            params.display_coordinates = true;
        }

        this.T.post('statuses/update', params)
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST statuses/update: ' + err));
            })
            .then(function(result) {
                self.isError(result);
            });
    },

    _update: function (params) {
        const self = this;
        this.T.post('statuses/update', params)
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST statuses/update: ' + err));
            })
            .then(function(result) {
                self.isError(result);
            });
    },

    update: function(tweet) {
        if (!this.T) return;

        var params = {};
        params.status = tweet;
        params = this.addLocation(params);

        this._update(params);
    },

    updateWithMedia: function (tweet, medias) {
        if (!this.T) return;
        if (!medias || medias.length === 0) {
            this.update(tweet);
            return;
        }

        const self = this;

        var params = {};
        params.status = tweet;
        params = this.addLocation(params);
        params.media_ids = [];

        var _upload = function (medias, i) {
            var media = medias[i];
            console.log(media);
            self.vorpal.log(color.yellow('-- Uploading file: ' + color.file(media)));
            var b64content = fs.readFileSync(media, { encoding: 'base64' });
            self.T.post('media/upload', { media_data: b64content }, function (err, data, response) {
                if (err) {
                    self.vorpal.log(color.error('Error POST media/upload: ' + err));
                    return;
                }
                params.media_ids.push(data.media_id_string);

                i++;
                if (i < medias.length) {
                    _upload(medias, i)
                } else {
                    self._update(params);
                }
            })
        };
        _upload(medias, 0);
    },

    addLocation: function (params) {
        var location = locator.getLocation(this.preferences);
        if (location) {
            this.vorpal.log(color.yellow('-- Status update with location: ' + location.lat + ', ' + location.lng));
            params.lat = location.lat;
            params.long = location.lng;
            params.display_coordinates = true;
        }
        return params;
    },

    message: function(screen_name, message) {
        if (!this.T) return;
        const self = this;
        this.T.post('direct_messages/new', { screen_name: screen_name, text: message })
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST direct_messages/new: ' + err));
            })
            .then(function(result) {
                self.isError(result);
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
                if (self.isError(result)) return;
                var text = '"' + birdknife_text.autoBoldStatusEntities(result.data) + '"';
                self.vorpal.log(color.event('-- Retweeted status: ' + text));
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
                if (self.isError(result)) return;
                var text = '"' + birdknife_text.autoBoldStatusEntities(result.data) + '"';
                self.vorpal.log(color.event('-- Liked status: ' + text));
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
                if (self.isError(result)) return;
                var text = '"' + birdknife_text.autoBoldStatusEntities(result.data) + '"';
                self.vorpal.log(color.event('-- Removed like from status: ' + text));
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
                if (self.isError(result)) return;
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
                if (self.isError(result)) return;
                self.vorpal.log(color.event('-- Unfollowed user: ' + color.bold('@' + result.data.screen_name)));
            });
    },
    
    block: function(screen_name) {
        if (!this.T) return;
        const self = this;
        this.T.post('blocks/create', { screen_name : screen_name })
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST blocks/create: ' + err));
            })
            .then(function(result) {
                if (self.isError(result)) return;
                self.vorpal.log(color.event('-- Blocked user: ' + color.bold('@' + result.data.screen_name)));
            });
    },

    unblock: function(screen_name) {
        if (!this.T) return;
        const self = this;
        this.T.post('blocks/destroy', { screen_name: screen_name })
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST blocks/destroy: ' + err));
            })
            .then(function(result) {
                if (self.isError(result)) return;
                self.vorpal.log(color.event('-- Unblocked user: ' + color.bold('@' + result.data.screen_name)));
            });
    },

    mute: function(screen_name) {
        if (!this.T) return;
        const self = this;
        this.T.post('mutes/users/create', { screen_name: screen_name })
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST mutes/users/create: ' + err));
            })
            .then(function(result) {
                if (self.isError(result)) return;
                self.vorpal.log(color.event('-- Muted user: ' + color.bold('@' + result.data.screen_name)));
            });
    },

    unmute: function(screen_name) {
        if (!this.T) return;
        const self = this;
        this.T.post('mutes/users/destroy', { screen_name: screen_name })
            .catch(function(err) {
                self.vorpal.log(color.error('Error POST mutes/users/destroy: ' + err));
            })
            .then(function(result) {
                if (self.isError(result)) return;
                self.vorpal.log(color.event('-- Unmuted user: ' + color.bold('@' + result.data.screen_name)));
            });
    },

    delete: function(status, callback) {
        callback = callback || function() {};
        if (!this.T) {
            callback();
            return;
        }
        const self = this;

        if (status.user.id_str !== this.ME.id_str && !status.retweeted_status) {
            this.vorpal.log(color.error("Can't delete status posted by another user!"));
            callback();
            return;
        }
        
        if (status.retweeted_status) {
            this.T.post('statuses/unretweet/:id', { id: status.id_str })
                .catch(function(err) {
                    self.vorpal.log(color.error('Error POST statuses/unretweet/:id: ' + err));
                    callback();
                })
                .then(function(result) {
                    if (self.isError(result)) return;
                    var text = '"' + birdknife_text.autoBoldStatusEntities(result.data) + '"';
                    self.vorpal.log(color.event('Removed retweet from status: ' + text));
                    callback();
                });
        }
        else {
            this.T.post('statuses/destroy/:id', { id: status.id_str })
                .catch(function(err) {
                    self.vorpal.log(color.error('Error POST statuses/destroy/:id: ' + err));
                    callback();
                })
                .then(function(result) {
                    if (self.isError(result)) {
                        callback();
                        return;
                    }
                    var text = '"' + birdknife_text.autoBoldStatusEntities(result.data) + '"';
                    self.vorpal.log(color.event('Deleted status: ' + text));
                    callback();
                });
        }
    },

    isError: function(result) {
        if (!result || result.resp === null) {
            this.vorpal.log(color.error('No result! Please check your internet connection and relogin...'));
            return true;
        }
        if (result.data.errors) {
            this.vorpal.log(color.error('Error: ' + result.data.errors[0].message));
            return true;
        }
        return false;
    },

    isMention: function(status) {
        for (var m in status.entities.user_mentions) {
            var mention = status.entities.user_mentions[m];
            if (mention.id_str === this.ME.id_str) return true;
        }
        return false;
    },

    displayEvent: function(event) {
        if (event.source.id_str === this.ME.id_str) return;
        var line = '-- ';
        var status = null;
        switch (event.event) {
            case 'favorite':
                line += color.bold('@' + event.source.screen_name);
                line += ' liked your tweet: ';
                line += '"' + birdknife_text.autoBoldStatusEntities(event.target_object) + '"';

                if (this.preferences.get('notifications')) notifier.notify({
                    'title': '@' + event.source.screen_name + ' liked',
                    'message': event.target_object.text
                });
                break;
            case 'follow':
                line += color.bold('@' + event.source.screen_name);
                line += ' started following you.';

                if (this.preferences.get('notifications')) notifier.notify({
                    'title': 'New follower',
                    'message': '@' + event.source.screen_name + ' followed you.'
                });
                break;
            case 'quoted_tweet':
                line += color.bold('@' + event.source.screen_name);
                line += ' quoted your tweet: ';
                status = event.target_object;

                if (this.preferences.get('notifications')) notifier.notify({
                    'title': '@' + event.source.screen_name + ' commented',
                    'message': event.target_object.text
                });
                break;
            case 'retweet':
                line += color.bold('@' + event.status.user.screen_name);
                line += ' retweeted your tweet: ';
                line += '"' + birdknife_text.autoBoldStatusEntities(event.status.retweeted_status) + '"';

                if (this.preferences.get('notifications')) notifier.notify({
                    'title': '@' + event.source.screen_name + ' retweeted',
                    'message': event.status.retweeted_status.text
                });
                break;
            case 'blocked':
                line += color.bold('@' + event.source.screen_name);
                line += ' blocked ';
                line += color.bold('@' + event.target.screen_name);

                if (this.preferences.get('notifications')) notifier.notify({
                    'title': 'New block',
                    'message': '@' + event.source.screen_name + ' blocked ' + '@' + event.target.screen_name
                });
                break;
            case 'retweeted_retweet':
                line += color.bold('@' + event.source.screen_name);
                line += ' retweeted your retweet: ';
                line += '"' + birdknife_text.autoBoldStatusEntities(event.target_object) + '"';

                if (this.preferences.get('notifications')) notifier.notify({
                    'title': '@' + event.source.screen_name + ' retweeted your retweet',
                    'message': event.target_object.text
                });
                break;
            case 'favorited_retweet':
                line += color.bold('@' + event.source.screen_name);
                line += ' liked your retweet: ';
                line += '"' + birdknife_text.autoBoldStatusEntities(event.target_object) + '"';

                if (this.preferences.get('notifications')) notifier.notify({
                    'title': '@' + event.source.screen_name + ' liked your retweet',
                    'message': event.target_object.text
                });
                break;
            default:
                this.vorpal.log(color.unknown_event(event.source.screen_name + ' "' + event.event + '" ' + event.target.screen_name));
                break;
        }
        line += '\n';
        this.vorpal.log(color.event(line));
        if (status) this.displayStatus(status, true);
    },

    cacheFromStatus: function(status) {
        this.cache.usernames.update({ k: '@' + status.user.screen_name }, { $inc: { count: 1 } }, { upsert: true });

        for (var u in status.entities.user_mentions) {
            var mention = status.entities.user_mentions[u];
            this.cache.usernames.update({ k: '@' + mention.screen_name }, { $inc: { count: 1 } }, { upsert: true });
        }

        for (var h in status.entities.hashtags) {
            var hashtag = status.entities.hashtags[h];
            this.cache.hashtags.update({ k: '#' + hashtag.text }, { $inc: { count: 1 } }, { upsert: true });
        }
    },

    displayRetweet: function(status) {
        var dummy = {
            "event": "retweet",
            "source": {
                "id_str": -1
            },
            "status": status
        };
        this.displayEvent(dummy);
    },

    displayUser: function(user, relationship) {
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

        if (user.id_str === this.ME.id_str) {
            line += '|\t' + color.bold('This is you.');
        }

        if (relationship.target.following && relationship.target.followed_by) {
            line += '|\t' + color.bold('You are following each other.');
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
        this.store.update({ id: id }, doc, { upsert: true });

        var line = id + '> ';
        if (message.recipient_screen_name !== this.ME.screen_name) {
            line += color.italic('@' + message.sender_screen_name + ' -> ' + '@' + message.recipient_screen_name + ' ');
        }
        line += color.bold('[@' + message.sender_screen_name + ' | ' + message.created_at + ']: ');
        line += message.text;
        line += '\n';
        
        this.vorpal.log(color.dm(line));
    },

    displayStatus: function(status, indented) {
        if (!this.ME) return;

        var id = ShortIdGenerator.generate();

        var doc = {
            id: id,
            type: 'status',
            status: status
        };
        this.store.update({ id: id }, doc, { upsert: true });
        this.cacheFromStatus(status);

        var isRetweet = status.retweeted_status ? true : false;

        if (isRetweet && status.retweeted_status.user.id_str === this.ME.id_str) {
            this.displayRetweet(status, indented);
            return;
        }

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
        else if (status.in_reply_to_status_id) line += '*';
        line += "@";
        line += status.user.screen_name === this.ME.screen_name
            ? color.my_screen_name(status.user.screen_name)
            : color.screen_name(status.user.screen_name);
        line += ">: ";
        line += indented ? text.replace(/(?:\r\n|\r|\n)/g, '\n\t') : text;
        line += '\n';
        this.vorpal.log(line);

        if (status.quoted_status) {
            this.displayStatus(status.quoted_status, true);
        }
        if (status.retweeted_status && status.retweeted_status.quoted_status) {
            this.displayStatus(status.retweeted_status.quoted_status, true);
        }
    }
};
