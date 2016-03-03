var color = require('./color_definitions'),
    Entities = require('html-entities').AllHtmlEntities;

var htmlEntities = new Entities();

module.exports = {
    autoBoldText: function(text, entities) {
        var result = "";
        entities.sort(function(a, b) {
            return a.indices[0] - b.indices[0];
        });

        var beginIndex = 0;
        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
            result += text.substring(beginIndex, entity.indices[0]);

            if (entity.type) {//Only 'photo' for now (https://dev.twitter.com/overview/api/entities-in-twitter-objects)
                result += color.bold(entity.display_url);
            } else if (entity.expanded_url) { //url
                result += color.bold(entity.expanded_url);
            } else if (entity.screen_name) { //reply
                result += color.bold('@' + entity.screen_name);
            } else if (entity.text) { //hashtag
                result += color.bold('#' + entity.text);
            }
            beginIndex = entity.indices[1];
        }
        result += text.substring(beginIndex, text.length);
        return htmlEntities.decode(result);
    },
    autoBoldStatusEntities: function(status) {
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

        return this.autoBoldText(text, flat_entities);
    },
    autoBoldBioEntities: function(user) {
        var flat_entities = [];

        for (var key in user.entities.description.urls) {
            flat_entities.push(user.entities.description.urls[key]);
        }

        return this.autoBoldText(user.description, flat_entities);
    },
    formatUserBio: function(user) {
        var description = this.autoBoldBioEntities(user);
        description = description.replace(/(?:\r\n|\r|\n)/g, '\n|\t');

        return '|\t' + description + '\n';
    }
};
