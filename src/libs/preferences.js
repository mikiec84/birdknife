/* eslint-disable import/no-dynamic-require */

import fs from 'fs';
import path from 'path';
import nconf from 'nconf';

const KEY_PREFERENCES = 'preferences:';
const KEY_AUTH = 'auth:';

const ACCESS_TOKEN = 'access_token';
const ACCESS_TOKEN_SECRET = 'access_token_secret';

class Preferences {

    /**
     * Constructor
     */
    constructor() {
        this.originalPath = process.env.NODE_ENV === 'test'
            ? path.join(path.dirname(__dirname), 'test/config.json')
            : path.join(path.dirname(require.main.filename), '../config.json');

        this.configPath = path.join(process.env[(process.platform === 'win32' ? 'USERPROFILE' : 'HOME')], '.birdknife.json');

        if (this.isAccessible()) {
            const local = require(this.originalPath);
            const user = require(this.configPath);

            if (local.version !== user.version) this.copyToUserDir();
        } else {
            this.copyToUserDir();
        }
        this.load();
    }

    /**
     * Load config file with nconf
     */
    load() {
        nconf.argv()
            .env()
            .file({ file: this.configPath });
    }

    /**
     * Get preference by key
     *
     * @param key
     * @returns {*}
     */
    get(key) {
        return nconf.get(KEY_PREFERENCES + key);
    }

    /**
     * Get preference as integer by key
     *
     * @param key
     * @returns {Number}
     */
    getInteger(key) {
        return parseInt(this.get(key), 10);
    }

    /**
     * Get auth value by key
     *
     * @param key
     * @returns {*}
     */
    getAuth(key) {
        return nconf.get(KEY_AUTH + key);
    }

    /**
     * Get all preferences
     *
     * @returns {*}
     */
    getAll() {
        return nconf.get(KEY_PREFERENCES.slice(0, -1));
    }

    /**
     * Set access token and secret
     *
     * @param accessToken
     * @param accessTokenSecret
     */
    setAccessToken(accessToken, accessTokenSecret) {
        nconf.set(KEY_AUTH + ACCESS_TOKEN, accessToken);
        nconf.set(KEY_AUTH + ACCESS_TOKEN_SECRET, accessTokenSecret);
        nconf.save();
    }

    /**
     * Check if access token and secret are set
     *
     * @returns {boolean}
     */
    checkAccessToken() {
        return this.getAuth(ACCESS_TOKEN) && this.getAuth(ACCESS_TOKEN_SECRET);
    }

    /**
     * Remove access token and secret
     */
    removeAccessToken() {
        this.setAccessToken(null, null);
    }

    /**
     * Set preference by key
     *
     * Validation of value depending on the key
     *
     * @param key
     * @param value
     * @returns {boolean}
     */
    set(key, value) {
        try {
            value = JSON.parse(value);
        } catch (err) {
        }
        switch (key) {
            case 'debug':
            case 'notifications':
            case 'tweet_protection':
                if (value !== true && value !== 'true') value = false;
                break;
            case 'location':
                if (value.constructor === Object) {
                    value = (value.lat && value.lng) ? value : false;
                } else if (value === true || value === 'true' || value === 'auto') {
                    value = 'auto';
                } else {
                    value = false;
                }
                break;
            case 'timestamp':
                value = parseInt(value, 10);
                if (isNaN(value) || value <= 0) value = 0;
                else if (value > 59) value = 59;
                break;
            default:
                return false;
        }
        nconf.set(KEY_PREFERENCES + key, value);
        nconf.save();
        return true;
    }

    /**
     * Check if the config file is accessible
     *
     * @returns {boolean}
     */
    isAccessible() {
        try {
            fs.accessSync(this.configPath, fs.F_OK);
        } catch (err) {
            return false;
        }
        return true;
    }

    /**
     * Copy the config file to the home directory of the user
     *
     * If the config file is neither readable nor writeable
     * use the config file of the package from now on
     */
    copyToUserDir() {
        try {
            fs.writeFileSync(this.configPath,
                fs.readFileSync(this.originalPath)
            );
        } catch (err) {
            // fallback
            console.error(err);
            this.configPath = this.originalPath;
        }
    }
}

export default Preferences;
