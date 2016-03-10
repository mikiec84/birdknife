var nconf = require('nconf'),
    fs = require('fs'),
    path = require('path');

module.exports = {
    originalPath: path.join(path.dirname(require.main.filename), 'config.json'),
    configPath: path.join(process.env[(process.platform == 'win32' ? 'USERPROFILE' : 'HOME')], '.birdknife.json'),

    init: function() {
        if (this.isAccessible()) {
            var local = require(this.originalPath);
            var user = require(this.configPath);

            if (local.version !== user.version) this.copyToUserDir();
        } else {
            this.copyToUserDir();
        }
        this.load();
    },

    get: function(key) {
        return nconf.get(key);
    },

    set: function(key, value) {
        if (typeof nconf.get(key) === 'undefined') return false;
        nconf.set(key, value);
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
