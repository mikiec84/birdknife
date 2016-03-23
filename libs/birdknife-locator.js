var request = require('sync-request');

module.exports = {
    url: "https://maps.googleapis.com/maps/api/browserlocation/json?browser=birdknife&sensor=true",

    getLocationAuto: function() {
        var res = request('GET', this.url);

        if (res.statusCode != 200) return false;

        var body = res.body.toString();
        var json = JSON.parse(body);

        if (!json.location) return false;
        return json.location;
    },

    getLocation: function(preferences) {
        var pref = preferences.get('location');

        //allowed values are false, 'auto' (or true), { lat: 0.0, lng: 0.0 }
        if (pref && pref.constructor === Object) return pref;
        if (pref === 'auto' || pref === true) return this.getLocationAuto();
        return false;
    }
};
