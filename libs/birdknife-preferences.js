var nconf = require('nconf'),
    fs = require('fs'),
    path = require('path');

const KEY_PREFERENCES = 'preferences:',
    KEY_AUTH = 'auth:';

module.exports = {
    originalPath: path.join(path.dirname(require.main.filename),
        process.env.NODE_ENV == 'test' ? 'test/config.json' : 'config.json'),
    configPath: path.join(process.env[(process.platform == 'win32' ? 'USERPROFILE' : 'HOME')], '.birdknife.json'),

    init: function() {
        if (this.isAccessible()) {
            var local = require(this.originalPath);
            var user = require(this.configPath);

            if (local.version !== user.version) this.copyToUserDir();
        } else {
            this.copyToUserDir();
        }
        console.log(this.originalPath);
        this.load();
    },

    get: function(key) {
        return nconf.get(KEY_PREFERENCES + key);
    },

    getInteger: function(key) {
        return parseInt(this.get(key));
    },

    getAuth: function(key) {
        return nconf.get(KEY_AUTH + key);
    },

    getAll: function() {
        return nconf.get(KEY_PREFERENCES.slice(0, -1));
    },

    setAccessToken: function(access_token, access_token_secret) {
        nconf.set('auth:access_token', access_token);
        nconf.set('auth:access_token_secret', access_token_secret);
        nconf.save();
    },

    checkAccessToken: function() {
        return nconf.get('auth:access_token') && nconf.get('auth:access_token_secret');
    },

    removeAccessToken: function() {
        nconf.set('auth:access_token', null);
        nconf.set('auth:access_token_secret', null);
        nconf.save();
    },

    set: function(key, value) {
        try {
            value = JSON.parse(value);
        } catch (e) {
        }
        switch(key) {
            case 'debug':
            case 'notifications':
            case 'tweet_protection':
                if (value !== true && value !== 'true') value = false;
                break;
            case 'location':
                if (value.constructor === Object) {
                    value = value.lat && value.lng ? value : false;
                } else if (value === true || value === 'true' || value === 'auto') {
                    value = 'auto';
                } else {
                    value = false;
                }
                break;
            case 'timestamp':
                value = parseInt(value);
                if (isNaN(value) || value <= 0) value = 0;
                else if (value > 59) value = 59;
                break;
            default:
                return false;
        }
        nconf.set(KEY_PREFERENCES + key, value);
        nconf.save();
        return true;
    },

    isAccessible: function() {
        try {
            fs.accessSync(this.configPath, fs.F_OK);
        } catch (e) {
            return false;
        }
        return true;
    },

    copyToUserDir: function() {
        try {
            fs.writeFileSync(this.configPath,
                fs.readFileSync(this.originalPath)
            );
        } catch (e) {
            //fallback
            console.log(e);
            this.configPath = this.originalPath;
        }
    },

    load: function() {
        const self = this;
        nconf.argv()
            .env()
            .file({ file: self.configPath });
    }
};
