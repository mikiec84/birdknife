/* eslint-disable import/no-unresolved, camelcase */

import fs from 'fs';
import util from 'util';
import Twit from 'twit';
import notifier from 'node-notifier';
import TwitterPinAuth from 'twitter-pin-auth';
import Color from './color-definitions';
import Location from './location';
import BirdknifeText from './text';
import ShortIdGenerator from './short-id-generator';

const shortIdGenerator = new ShortIdGenerator();

class TwitterAPI {

    /**
     * Constructor
     *
     * @param preferences
     * @param vorpal
     * @param store
     * @param cache
     */
    constructor(preferences, vorpal, store, cache) {
        this.vorpal = vorpal;
        this.preferences = preferences;
        this.store = store;
        this.cache = cache;

        this.T = null;
        this.stream = null;
        this.ME = null;

        this.TEST = process.env.NODE_ENV === 'test';
    }

    /**
     * Logout
     *
     * Removes access_token and access_token_secret
     * from preferences
     */
    logout() {
        this.stream.stop();
        this.T = null;
        this.ME = null;
        this.preferences.removeAccessToken();
    }

    /**
     * Login
     *
     * Authenticate with Twitter and save
     * access_token and access_token_secret in
     * preferences
     */
    login() {
        const self = this;

        /* eslint-disable key-spacing */
        this.T = new Twit({
            consumer_key:        this.preferences.getAuth('consumer_key'),
            consumer_secret:     this.preferences.getAuth('consumer_secret'),
            access_token:        this.preferences.getAuth('access_token'),
            access_token_secret: this.preferences.getAuth('access_token_secret')
        });
        /* eslint-enable key-spacing */

        this.loadMyself();

        if (!this.TEST) {
            setTimeout(() => {
                self.startStream();
                self.loadHome();
            }, 3000);
        }
    }

    /**
     * Authenticate via PIN auth
     *
     * @param cmd
     * @param callback
     */
    authenticate(cmd, callback) {
        const twitterPinAuth = new TwitterPinAuth(
            this.preferences.getAuth('consumer_key'),
            this.preferences.getAuth('consumer_secret')
        );

        twitterPinAuth.requestAuthUrl()
            .then(url => {
                cmd.log(`${Color.yellow('Login and copy the PIN number:')} ${Color.url(url)}`);
            })
            .catch(err => {
                cmd.log(Color.error(`Error: ${err}`));
            });

        cmd.prompt({
            type: 'input',
            name: 'pin',
            default: null,
            message: 'PIN: '
        }, result => {
            if (!result.pin) return;
            twitterPinAuth.authorize(result.pin)
                .then(data => {
                    this.preferences.setAccessToken(data.accessTokenKey, data.accessTokenSecret);

                    cmd.log(Color.success('\nAuthentication successful!\n'));
                    cmd.log(Color.blue('Logging in...'));

                    this.login();
                    callback();
                })
                .catch(err => {
                    cmd.log(Color.error('Authentication failed!'));
                    cmd.log(err);
                    callback();
                });
        });
    }

    /**
     * Start user stream
     */
    startStream() {
        if (!this.T) return;
        const self = this;

        this.vorpal.log(Color.blue('Starting Stream...\n'));

        this.stream = this.T.stream('user');

        this.stream.on('error', error => {
            self.vorpal.log(Color.error(`Stream error: ${error.twitterReply}`));
            self.vorpal.log(error);
        });

        this.stream.on('tweet', status => {
            self.displayStatus(status);

            if (self.isMention(status)) {
                if (self.preferences.get('notifications')) {
                    notifier.notify({
                        title: `@${status.user.screen_name}`,
                        message: status.text
                    });
                }
            }
        });

        this.stream.on('direct_message', message => {
            self.displayDM(message.direct_message);

            if (self.preferences.get('notifications')) {
                notifier.notify({
                    title: `Message from @${message.sender_screen_name}`,
                    message: message.text
                });
            }
        });

        this.stream.on('user_event', event => {
            self.displayEvent(event);
        });
    }

    /**
     * Load authenticated user information
     */
    loadMyself() {
        if (!this.T) return;
        const self = this;
        this.T.get('account/verify_credentials', { skip_status: true })
            .catch(err => {
                self.vorpal.log(Color.error(`Error GET account/verify_credentials: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                if (!self.TEST) self.vorpal.log(Color.success(`Logged in as ${Color.bold(result.data.screen_name)}`));
                self.ME = result.data;
            });
    }

    /**
     * Load tweets of user by screen_name.
     * If screen_name is not given, load authenticated
     * users home timeline.
     *
     * @param screenName
     */
    loadTimeline(screenName) {
        if (screenName) this.loadUserTimeline(screenName);
        else this.loadHome();
    }

    /**
     * Load authenticated users home timeline
     */
    loadHome() {
        if (!this.T) return;
        const self = this;
        this.T.get('statuses/home_timeline', { count: 20, include_entities: 'true' })
            .catch(err => {
                self.vorpal.log(Color.error(`Error GET statuses/home_timeline: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                result.data.reverse().forEach(tweet => {
                    self.displayStatus(tweet);
                });
            });
    }

    /**
     * Load tweets of user by screen_name
     *
     * @param screenName
     */
    loadUserTimeline(screenName) {
        if (!this.T) return;
        const self = this;
        this.T.get('statuses/user_timeline', { count: 50, screen_name: screenName, include_entities: 'true' })
            .catch(err => {
                self.vorpal.log(Color.error(`Error GET statuses/user_timeline: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                result.data.reverse().forEach(tweet => {
                    self.displayStatus(tweet);
                });
            });
    }

    /**
     * Load replies of authenticated user
     */
    loadReplies() {
        if (!this.T) return;
        const self = this;
        this.T.get('statuses/mentions_timeline')
            .catch(err => {
                self.vorpal.log(Color.error(`Error GET statuses/mentions_timeline: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                result.data.reverse().forEach(tweet => {
                    self.displayStatus(tweet);
                });
            });
    }

    /**
     * Load direct messages of authenticated user
     */
    loadDMs() {
        if (!this.T) return;
        const self = this;
        this.T.get('direct_messages', { full_text: true })
            .catch(err => {
                self.vorpal.log(Color.error(`Error GET direct_messages: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                result.data.reverse().forEach(message => {
                    self.displayDM(message);
                });
            });
    }

    /**
     * Load direct messages sent by the authenticated user
     */
    loadSentDMs() {
        if (!this.T) return;
        const self = this;
        this.T.get('direct_messages/sent', { full_text: true })
            .catch(err => {
                self.vorpal.log(Color.error(`Error GET direct_messages/sent: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                result.data.reverse().forEach(message => {
                    self.displayDM(message);
                });
            });
    }

    /**
     * Load user information by screen_name
     *
     * @param screenName
     */
    loadUser(screenName) {
        if (!this.T) return;
        const self = this;
        this.T.get('users/show', { screen_name: screenName })
            .catch(err => {
                self.vorpal.log(Color.error(`Error GET users/show: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                self.T.get('friendships/show', { source_id: self.ME.id_str, target_id: result.data.id_str })
                    .catch(err => {
                        self.vorpal.log(Color.error(`Error GET users/show: ${err}`));
                    })
                    .then(result2 => {
                        self.displayUser(result.data, result2.data.relationship);
                    });
            });
    }

    /**
     * Search
     *
     * @param query
     */
    search(query) {
        if (!this.T) return;
        const self = this;
        query = encodeURIComponent(query);
        this.T.get('search/tweets', { q: query, count: 50 })
            .catch(err => {
                self.vorpal.log(Color.error(`Error GET search/tweets: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                result.data.statuses.reverse().forEach(tweet => {
                    self.displayStatus(tweet);
                });
            });
    }

    /**
     * Recursively load a conversation/thread
     *
     * @param statuses
     * @param inReplyToStatusId
     * @todo #54
     */
    loadConversationRec(statuses, inReplyToStatusId) {
        if (!this.T) return;
        const self = this;

        this.store.findOne({ $and: [{ type: 'status' }, { 'status.id_str': inReplyToStatusId }] }, (err, doc) => {
            if (err) return self.vorpal.log(`Error getting from cache: ${err}`);
            if (!doc) return self.vorpal.log(`Didn't find anything`);

            self.vorpal.log(`Found with text!!! ${doc.status.text}`);

            if (err || !doc) {
                this.T.get('statuses/show/:id', { id: inReplyToStatusId, include_entities: 'true' })
                    .catch(err => {
                        self.vorpal.log(Color.error(`Error GET statuses/show/:id: ${err}`));
                    })
                    .then(result => {
                        if (!result || result.resp === null) {
                            return self.vorpal.log(Color.error('No result! Please check your internet connection and relogin...'));
                        }

                        if (result.data.errors) {
                            self.displayConversationStatuses(statuses);

                            self.vorpal.log(Color.error(`Error: ${result.data.errors[0].message}`));
                            return;
                        }

                        statuses.push(result.data);
                        if (result.data.in_reply_to_status_id_str) {
                            self.loadConversationRec(statuses, result.data.in_reply_to_status_id_str);
                        } else {
                            self.displayConversationStatuses(statuses);
                        }
                    });
            } else {
                statuses.push(doc.status);
                if (doc.status.in_reply_to_status_id_str) {
                    self.loadConversationRec(statuses, doc.status.in_reply_to_status_id_str);
                } else {
                    self.displayConversationStatuses(statuses);
                }
            }
        });
    }

    /**
     * Display multiple statuses
     *
     * Note: array gets reversed!
     *
     * @param statuses
     */
    displayConversationStatuses(statuses) {
        if (!statuses) return;
        statuses = statuses.reverse();

        this.displayStatus(statuses[0], false);
        statuses.slice(1).forEach(status => {
            this.displayStatus(status, true);
        });
    }

    /**
     * Inits recursive loading of a conversation/thread
     *
     * @param id cache
     * @param cmd
     */
    loadConversation(id, cmd) {
        this.store.findOne({ id }, (err, doc) => {
            if (err) return cmd.log(Color.error(`Error: ${err}`));

            if (!doc || doc.type !== 'status') {
                return cmd.log(Color.error('Warning: No status found with this id.'));
            }

            const originalStatus = doc.status.retweeted_status || doc.status;
            this.loadConversationRec([], originalStatus.id_str);
        });
    }

    /**
     *
     * @param id cache
     * @param text
     * @param cmd
     */
    reply(id, text, cmd) {
        this.store.findOne({ id }, (err, doc) => {
            if (err) return cmd.log(Color.error(`Error: ${err}`));

            if (!doc) {
                return cmd.log(Color.error('Warning: No status or message found with this id.'));
            }

            switch (doc.type) {
                case 'status':
                    text = BirdknifeText.addMentionsToReply(this.ME.screen_name, text, doc.status);
                    this._reply(text, doc.status.id_str);
                    break;

                case 'message':
                    this.message(doc.message.sender_screen_name, text);
                    break;

                default:
                    cmd.log(Color.error('Warning: Unsupported command for this element.'));
            }
        });
    }

    /**
     * Reply to a status
     *
     * @param tweet
     * @param inReplyToStatusId
     */
    _reply(tweet, inReplyToStatusId) {
        if (!this.T) return;
        const self = this;

        const params = {};
        params.status = tweet;
        params.in_reply_to_status_id = inReplyToStatusId;

        const location = Location.getLocation(this.preferences);
        if (location) {
            this.vorpal.log(Color.yellow(`-- Reply with location: ${location.lat}, ${location.lng}`));
            params.lat = location.lat;
            params.long = location.lng;
            params.display_coordinates = true;
        }

        this.T.post('statuses/update', params)
            .catch(err => {
                self.vorpal.log(Color.error(`Error POST statuses/update: ${err}`));
            })
            .then(result => {
                self.isError(result);
            });
    }

    /**
     * Quote tweet
     *
     * @param id cache
     * @param text
     * @param cmd
     */
    quote(id, text, cmd) {
        this.store.findOne({ id }, (err, doc) => {
            if (err) return cmd.log(Color.error(`Error: ${err}`));

            if (!doc || doc.type !== 'status') {
                return cmd.log(Color.error('Warning: No status found with this id.'));
            }

            const screenName = doc.status.retweeted_status
                ? doc.status.retweeted_status.user.screen_name : doc.status.user.screen_name;
            text += ' ' + BirdknifeText._getStatusURL(screenName, doc.status.id_str);

            this.update(text);
        });
    }

    /**
     * Sent direct message to given screen_name
     *
     * @param screenName
     * @param message
     */
    message(screenName, message) {
        if (!this.T) return;
        const self = this;
        this.T.post('direct_messages/new', { screen_name: screenName, text: message })
            .catch(err => {
                self.vorpal.log(Color.error(`Error POST direct_messages/new: ${err}`));
            })
            .then(result => {
                self.isError(result);
            });
    }

    /**
     * Update Twitter status
     *
     * @param params
     * @private
     */
    _update(params) {
        const self = this;
        this.T.post('statuses/update', params)
            .catch(err => {
                self.vorpal.log(Color.error(`Error POST statuses/update: ${err}`));
            })
            .then(result => {
                self.isError(result);
            });
    }

    /**
     * Handles updating Twitter status
     *
     * @param tweet
     */
    update(tweet) {
        if (!this.T) return;

        let params = {};
        params.status = tweet;
        params = this.addLocation(params);

        this._update(params);
    }

    /**
     * Update status with media
     *
     * @param tweet
     * @param medias
     * @return {*}
     */
    updateWithMedia(tweet, medias) {
        if (!this.T) return;
        if (!medias || medias.length === 0) return this.update(tweet);

        const self = this;

        let params = {};
        params.status = tweet;
        params = this.addLocation(params);
        params.media_ids = [];

        const _upload = (medias, i) => {
            const media = medias[i];
            self.vorpal.log(Color.yellow(`-- Uploading file: ${Color.file(media)}`));
            let b64content;
            try {
                b64content = fs.readFileSync(media, { encoding: 'base64' });
            } catch (err) {
                return self.vorpal.log(`${Color.error('Error uploading file:')} ${err.message}`);
            }
            self.T.post('media/upload', { media_data: b64content }, (err, data) => {
                if (err) return self.vorpal.log(Color.error(`Error POST media/upload: ${err}`));
                params.media_ids.push(data.media_id_string);

                i++;
                if (i < medias.length) {
                    _upload(medias, i);
                } else {
                    self._update(params);
                }
            });
        };
        _upload(medias, 0);
    }

    /**
     * Tweet
     *
     * @param text
     * @param cmd
     * @param callback
     * @return {Vorpal|*}
     */
    tweet(text, cmd, callback) {
        if (this.preferences.get('tweet_protection')) {
            cmd.log(Color.yellow(Color.bold('WARNING:') +
                ' You enabled tweet protection. Update status with ' +
                Color.bold('/tweet') +
                ' or disable tweet protection.')
            );
        } else if (text.charAt(0) === '/') {
            return cmd.prompt({
                type: 'confirm',
                name: 'protin',
                default: null,
                message: Color.yellow(`${Color.bold('WARNING:')} Do you really want to tweet this?`)
            }, result => {
                if (result.protin) {
                    this.update(text);
                }
                callback();
            });
        } else {
            this.update(text);
        }
        callback();
    }

    /**
     * Get location depending on preference
     *
     * @param params
     * @return {*}
     */
    addLocation(params) {
        const location = Location.getLocation(this.preferences);
        if (location) {
            this.vorpal.log(Color.yellow(`-- Status update with location: ${location.lat}, ${location.lng}`));
            params.lat = location.lat;
            params.long = location.lng;
            params.display_coordinates = true;
        }
        return params;
    }

    /**
     *
     * @param id cache
     * @param cmd
     */
    retweet(id, cmd) {
        this.store.findOne({ id }, (err, doc) => {
            if (err) return cmd.log(Color.error(`Error: ${err}`));

            if (!doc || doc.type !== 'status') {
                return cmd.log(Color.error('Warning: No status found with this id.'));
            }

            this._retweet(doc.status.id_str);
        });
    }

    /**
     * Retweet by id
     *
     * @param id Status
     * @private
     */
    _retweet(id) {
        if (!this.T) return;
        const self = this;
        this.T.post('statuses/retweet/:id', { id })
            .catch(err => {
                self.vorpal.log(Color.error(`Error POST statuses/retweet/:id: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                const text = `"${BirdknifeText.autoBoldStatusEntities(result.data)}"`;
                self.vorpal.log(Color.event(`-- Retweeted status: ${text}`));
            });
    }

    /**
     *
     * @param id cache
     * @param cmd
     */
    like(id, cmd) {
        this.store.findOne({ id }, (err, doc) => {
            if (err) return cmd.log(Color.error(`Error: ${err}`));

            if (!doc || doc.type !== 'status') {
                return cmd.log(Color.error('Warning: No status found with this id.'));
            }

            this._like(doc.status.id_str);
        });
    }

    /**
     * Like/Favorite by id
     *
     * @param id Status
     */
    _like(id) {
        if (!this.T) return;
        const self = this;
        this.T.post('favorites/create', { id })
            .catch(err => {
                self.vorpal.log(Color.error(`Error POST favorites/create: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                const text = `"${BirdknifeText.autoBoldStatusEntities(result.data)}"`;
                self.vorpal.log(Color.event(`-- Liked status: ${text}`));
            });
    }

    /**
     *
     * @param id cache
     * @param cmd
     */
    unlike(id, cmd) {
        this.store.findOne({ id }, (err, doc) => {
            if (err) return cmd.log(Color.error(`Error: ${err}`));

            if (!doc || doc.type !== 'status') {
                return cmd.log(Color.error('Warning: No status found with this id.'));
            }

            this._unlike(doc.status.id_str);
        });
    }

    /**
     * Remove like/favorite
     *
     * @param id Status
     */
    _unlike(id) {
        if (!this.T) return;
        const self = this;
        this.T.post('favorites/destroy', { id })
            .catch(err => {
                self.vorpal.log(Color.error(`Error POST favorites/destroy: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                const text = `"${BirdknifeText.autoBoldStatusEntities(result.data)}"`;
                self.vorpal.log(Color.event(`-- Removed like from status: ${text}`));
            });
    }

    /**
     * Follow user by screen_name
     *
     * @param screenName
     */
    follow(screenName) {
        if (!this.T) return;
        const self = this;
        this.T.post('friendships/create', { screen_name: screenName })
            .catch(err => {
                self.vorpal.log(Color.error(`Error POST friendships/create: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                self.vorpal.log(Color.event(`-- Followed user: ${Color.bold(`@${result.data.screen_name}`)}`));
            });
    }

    /**
     * Unfollow user by screen_name
     *
     * @param screenName
     */
    unfollow(screenName) {
        if (!this.T) return;
        const self = this;
        this.T.post('friendships/destroy', { screen_name: screenName })
            .catch(err => {
                self.vorpal.log(Color.error(`Error POST friendships/destroy: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                self.vorpal.log(Color.event(`-- Unfollowed user: ${Color.bold(`@${result.data.screen_name}`)}`));
            });
    }

    /**
     * Block user by screen_name
     *
     * @param screenName
     */
    block(screenName) {
        if (!this.T) return;
        const self = this;
        this.T.post('blocks/create', { screen_name: screenName })
            .catch(err => {
                self.vorpal.log(Color.error(`Error POST blocks/create: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                self.vorpal.log(Color.event(`-- Blocked user: ${Color.bold(`@${result.data.screen_name}`)}`));
            });
    }

    /**
     * Unblock user by screen_name
     *
     * @param screenName
     */
    unblock(screenName) {
        if (!this.T) return;
        const self = this;
        this.T.post('blocks/destroy', { screen_name: screenName })
            .catch(err => {
                self.vorpal.log(Color.error(`Error POST blocks/destroy: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                self.vorpal.log(Color.event(`-- Unblocked user: ${Color.bold(`@${result.data.screen_name}`)}`));
            });
    }

    /**
     * Mute user by screen_name
     *
     * @param screenName
     */
    mute(screenName) {
        if (!this.T) return;
        const self = this;
        this.T.post('mutes/users/create', { screen_name: screenName })
            .catch(err => {
                self.vorpal.log(Color.error(`Error POST mutes/users/create: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                self.vorpal.log(Color.event(`-- Muted user: ${Color.bold(`@${result.data.screen_name}`)}`));
            });
    }

    /**
     * Unmute user by screen_name
     *
     * @param screenName
     */
    unmute(screenName) {
        if (!this.T) return;
        const self = this;
        this.T.post('mutes/users/destroy', { screen_name: screenName })
            .catch(err => {
                self.vorpal.log(Color.error(`Error POST mutes/users/destroy: ${err}`));
            })
            .then(result => {
                if (self.isError(result)) return;
                self.vorpal.log(Color.event(`-- Unmuted user: ${Color.bold(`@${result.data.screen_name}`)}`));
            });
    }

    deleteStatus(id, cmd, callback = () => {}) {
        this.store.findOne({ id }, (err, doc) => {
            if (err) {
                cmd.log(Color.error(`Error: ${err}`));
                return callback();
            }
            if (!doc || doc.type !== 'status') {
                cmd.log(Color.error('Warning: No status found with this id.'));
                return callback();
            }

            this._deleteStatus(doc.status, callback);
        });
    }

    /**
     * Delete status or unretweet
     *
     * @param status
     * @param callback
     * @private
     */
    _deleteStatus(status, callback) {
        if (!this.T) {
            return callback();
        }
        const self = this;

        if (status.user.id_str !== this.ME.id_str && !status.retweeted_status) {
            this.vorpal.log(Color.error('Can\'t delete status posted by another user!'));
            return callback();
        }

        if (status.retweeted_status) {
            this.T.post('statuses/unretweet/:id', { id: status.id_str })
                .catch(err => {
                    self.vorpal.log(Color.error(`Error POST statuses/unretweet/:id: ${err}`));
                    callback();
                })
                .then(result => {
                    if (self.isError(result)) return;
                    const text = `"${BirdknifeText.autoBoldStatusEntities(result.data)}"`;
                    self.vorpal.log(Color.event(`Removed retweet from status: ${text}`));
                    callback();
                });
        } else {
            this.T.post('statuses/destroy/:id', { id: status.id_str })
                .catch(err => {
                    self.vorpal.log(Color.error(`Error POST statuses/destroy/:id: ${err}`));
                    callback();
                })
                .then(result => {
                    if (self.isError(result)) return callback();
                    const text = `"${BirdknifeText.autoBoldStatusEntities(result.data)}"`;
                    self.vorpal.log(Color.event(`Deleted status: ${text}`));
                    callback();
                });
        }
    }

    /**
     * Check if result is/contains an error
     *
     * @param result
     * @return {boolean}
     */
    isError(result) {
        if (!result || result.resp === null) {
            this.vorpal.log(Color.error('No result! Please check your internet connection and relogin...'));
            return true;
        }
        if (result.data.errors) {
            this.vorpal.log(Color.error(`Error: ${result.data.errors[0].message}`));
            return true;
        } else if (result.data.error) {
            this.vorpal.log(Color.error(`Error: ${result.data.error}`));
            return true;
        }
        return false;
    }

    /**
     * Check if status is a mention for the
     * authenticated user
     *
     * @param status
     * @return {boolean}
     */
    isMention(status) {
        if (status.entities.user_mentions) {
            for (const mention of status.entities.user_mentions) {
                if (mention.id_str === this.ME.id_str) return true;
            }
        }
        return false;
    }

    /**
     * Display event
     *
     * @param event
     */
    displayEvent(event) {
        if (event.source.id_str === this.ME.id_str) return;

        let status = null;
        const extended_tweet = event.target_object
            ? event.target_object.extended_tweet
            : null;
        const extended_retweet = (event.status && event.status.retweeted_status)
            ? event.status.retweeted_status.extended_tweet
            : null;

        let line = '-- ';
        switch (event.event) {
            case 'favorite':
                line += Color.bold(`@${event.source.screen_name}`);
                line += ' liked your tweet: ';
                line += `"${BirdknifeText.autoBoldStatusEntities(event.target_object)}"`;

                if (this.preferences.get('notifications')) {
                    notifier.notify({
                        title: `@${event.source.screen_name} liked`,
                        message: extended_tweet ? extended_tweet.full_text : event.target_object.text
                    });
                }
                break;
            case 'follow':
                line += Color.bold(`@${event.source.screen_name}`);
                line += ' started following you.';

                if (this.preferences.get('notifications')) {
                    notifier.notify({
                        title: 'New follower',
                        message: `@${event.source.screen_name} followed you.`
                    });
                }
                break;
            case 'quoted_tweet':
                line += Color.bold(`@${event.source.screen_name}`);
                line += ' quoted your tweet: ';
                status = event.target_object;

                if (this.preferences.get('notifications')) {
                    notifier.notify({
                        title: `@${event.source.screen_name} commented`,
                        message: extended_tweet ? extended_tweet.full_text : event.target_object.text
                    });
                }
                break;
            case 'retweet':
                line += Color.bold(`@${event.status.user.screen_name}`);
                line += ' retweeted your tweet: ';
                line += `"${BirdknifeText.autoBoldStatusEntities(event.status.retweeted_status)}"`;

                if (this.preferences.get('notifications')) {
                    notifier.notify({
                        title: `@${event.source.screen_name} retweeted`,
                        message: extended_retweet ? extended_retweet.text : event.status.retweeted_status.text
                    });
                }
                break;
            case 'blocked':
                line += Color.bold(`@${event.source.screen_name}`);
                line += ' blocked ';
                line += Color.bold(`@${event.target.screen_name}`);

                if (this.preferences.get('notifications')) {
                    notifier.notify({
                        title: 'New block',
                        message: `@${event.source.screen_name} blocked @${event.target.screen_name}`
                    });
                }
                break;
            case 'retweeted_retweet':
                line += Color.bold(`@${event.source.screen_name}`);
                line += ' retweeted your retweet: ';
                line += `"${BirdknifeText.autoBoldStatusEntities(event.target_object)}"`;

                if (this.preferences.get('notifications')) {
                    notifier.notify({
                        title: `@${event.source.screen_name} retweeted your retweet`,
                        message: extended_tweet ? extended_tweet.full_text : event.target_object.text
                    });
                }
                break;
            case 'favorited_retweet':
                line += Color.bold(`@${event.source.screen_name}`);
                line += ' liked your retweet: ';
                line += `"${BirdknifeText.autoBoldStatusEntities(event.target_object)}"`;

                if (this.preferences.get('notifications')) {
                    notifier.notify({
                        title: `@${event.source.screen_name} liked your retweet`,
                        message: extended_tweet ? extended_tweet.full_text : event.target_object.text
                    });
                }
                break;
            default:
                this.vorpal.log(Color.unknown_event(`${event.source.screen_name} "${event.event}" ${event.target.screen_name}`));
                break;
        }
        line += '\n';
        this.vorpal.log(Color.event(line));
        if (status) this.displayStatus(status, true);
    }

    /**
     * Upsert status entities into cache
     *
     * @param status
     */
    cacheFromStatus(status) {
        this.cache.usernames.update({ k: `@${status.user.screen_name}` }, { $inc: { count: 1 } }, { upsert: true });

        if (status.entities.user_mentions) {
            for (const mention of status.entities.user_mentions) {
                this.cache.usernames.update({ k: `@${mention.screen_name}` }, { $inc: { count: 1 } }, { upsert: true });
            }
        }

        if (status.entities.hashtags) {
            for (const hashtag of status.entities.hashtags) {
                this.cache.hashtags.update({ k: `#${hashtag.text}` }, { $inc: { count: 1 } }, { upsert: true });
            }
        }
    }

    /**
     * Display retweet as a pseudo event
     *
     * @param status
     */
    displayRetweet(status) {
        const dummy = {
            event: 'retweet',
            source: {
                id_str: -1
            },
            status
        };
        this.displayEvent(dummy);
    }

    /**
     * Display user information including bio
     *
     * @param user
     * @param relationship
     */
    displayUser(user, relationship) {
        let line = '\n';
        line += `|\t${Color.bold('Name:')} ${user.name} (@${user.screen_name})\n`;
        line += `|\t${Color.bold('Created At:')} ${user.created_at}\n`;
        line += `|\t${Color.bold('Follower:')} ${user.followers_count}\t${Color.bold('Following:')} ${user.friends_count}\n`;
        line += `|\t${Color.bold('Tweets:')} ${user.statuses_count}\n`;
        line += '|\n';
        line += `|\t${Color.bold('URL:')} ${user.entities.url ? user.entities.url.urls[0].expanded_url : user.url}\n`;
        line += `|\t${Color.bold('Location:')} ${user.location}\n`;
        line += '|\n';
        line += `|\t${Color.bold('----------------------- Bio -----------------------')}\n`;
        line += BirdknifeText.formatUserBio(user);
        line += `|\t${Color.bold('---------------------------------------------------')}\n`;
        line += '|\n';

        if (user.id_str === this.ME.id_str) {
            line += `|\t${Color.bold('This is you.')}`;
        }

        if (relationship.target.following && relationship.target.followed_by) {
            line += `|\t${Color.bold('You are following each other.')}`;
        } else if (relationship.target.following) {
            line += `|\t${Color.bold('This user is following you.')}`;
        } else if (relationship.target.followed_by) {
            line += `|\t${Color.bold('You are following this user.')}`;
        }

        line += '\n';

        this.vorpal.log(line);
    }

    /**
     * Display direct message
     *
     * @param message
     */
    displayDM(message) {
        const id = shortIdGenerator.generateSpecial('d');

        const doc = {
            id,
            type: 'message',
            message
        };
        this.store.update({ id }, doc, { upsert: true });

        let line = `${id}> `;
        if (message.recipient_screen_name !== this.ME.screen_name) {
            line += Color.italic(`@${message.sender_screen_name} -> @${message.recipient_screen_name} `);
        }
        line += Color.bold(`[@${message.sender_screen_name} | ${message.created_at}]: `);
        line += message.text;
        line += '\n';

        this.vorpal.log(Color.dm(line));
    }

    /**
     * Display status
     *
     * @param status
     * @param indented
     * @return {*}
     */
    displayStatus(status, indented) {
        if (!this.ME) return;

        const id = shortIdGenerator.generate();

        const doc = {
            id,
            type: 'status',
            status
        };
        this.store.update({ id }, doc, { upsert: true });
        this.cacheFromStatus(status);

        const isRetweet = Boolean(status.retweeted_status);

        if (isRetweet && status.retweeted_status.user.id_str === this.ME.id_str && status.user.id_str !== this.ME.id_str) {
            return this.displayRetweet(status, indented);
        }

        let text = BirdknifeText.autoBoldStatusEntities(status);

        if (isRetweet) {
            text = `RT ${Color.bold(`@${status.retweeted_status.user.screen_name}:`)} ${text}`;
        }

        if (this.isMention(status)) text = Color.reply(text);
        else if (indented) text = Color.indented(text);

        let line = `${id}> `;
        if (indented) line += '|\t';
        line += '<';
        if (indented) line += '↑';
        else if (status.in_reply_to_status_id) line += '*';
        line += '@';
        line += status.user.screen_name === this.ME.screen_name
            ? Color.myScreenName(status.user.screen_name)
            : Color.screenName(status.user.screen_name);
        line += '>: ';
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

    showStatus(id, debug, cmd, callback) {
        this.store.findOne({ id }, (err, doc) => {
            if (err) {
                cmd.log(Color.error(`Error: ${err}`));
                return callback();
            }
            if (!doc) {
                cmd.log(Color.error('Warning: No status found with this id.'));
                return callback();
            }

            const obj = doc.status || doc.message;
            if (debug || doc.type === 'message') {
                cmd.log(
                    util.inspect(obj, { showHidden: false, depth: null })
                );
            } else {
                let log = '\n';
                log += `|\t${Color.bold('User:')} ${obj.user.name} (@${obj.user.screen_name})\n`;
                log += '|\t\n';
                log += `|\t${Color.bold('Text:')} ${obj.text}\n`;
                log += `|\t${Color.bold('Created At:')} ${obj.created_at}\n`;
                log += `|\t${Color.bold('Favorites:')} ${obj.favorite_count || '0'}\n`;
                log += `|\t${Color.bold('Retweets:')} ${obj.retweet_count || '0'}\n`;
                if (obj.place) {
                    log += `|\t${Color.bold('Location: ')}${obj.place.full_name}\n`;
                }
                if (obj.coordinates) {
                    const coordinates = obj.coordinates.coordinates;
                    log += `|\t${Color.bold('Location (Coordinates):')} ${coordinates[0]}, ${coordinates[1]}\n`;
                }
                log += `|\t${Color.bold('Source:')} ${obj.source}\n`;
                cmd.log(log);
            }
            callback();
        });
    }
}

export default TwitterAPI;
