// var twitter = require('twitter-text');
var colors = require('colors');

module.exports = {
    autoBoldEntities: function(status) {
        var result = "";
        var isRetweet = status.retweeted_status ? true : false;
        var text = isRetweet ? status.retweeted_status.text : status.text;
        var entities = isRetweet ? status.retweeted_status.entities : status.entities;

        var flat_entities = [];

        for (var key in entities.user_mentions) {
            flat_entities.push(entities.user_mentions[key]);
        }
        for (var key in entities.urls) {
            flat_entities.push(entities.urls[key]);
        }
        for (var key in entities.hashtags) {
            flat_entities.push(entities.hashtags[key]);
        }
        for (var key in entities.media) {
            flat_entities.push(entities.media[key]);
        }

        flat_entities.sort(function(a, b) {
            return a.indices[0] - b.indices[0];
        });

        var beginIndex = 0;
        for (var i = 0; i < flat_entities.length; i++) {
            var entity = flat_entities[i];
            result += text.substring(beginIndex, entity.indices[0]);

            if (entity.type) {//Only 'photo' for now (https://dev.twitter.com/overview/api/entities-in-twitter-objects)
                result += entity.display_url.bold;
            } else if (entity.expanded_url) { //url
                result += entity.expanded_url.bold;
            } else if (entity.screen_name) { //mention
                result += ('@' + entity.screen_name).bold;
            } else if (entity.text) { //hashtag
                result += ('#' + entity.text).bold;
            }
            beginIndex = entity.indices[1];
        }
        result += text.substring(beginIndex, text.length);
        return result;
    }
};
