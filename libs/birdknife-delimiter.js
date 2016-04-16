var color = require('./color_definitions'),
    twitter = require('twitter-text'),
    text = require('./birdknife-text');

module.exports = {
    PAD: '000',
    explicit_count: 0,

    updateExplicitCount: function(status, withMedia) {
        this.explicit_count = twitter.getTweetLength(status) + (withMedia ? 24 : 0);
    },

    setDelimiter: function(ui, count, explicit) {
        if (count < 0) count = 0;

        var pre = explicit ? 'Tweet' : 'birdknife';

        var _s = (this.PAD + count).slice(-this.PAD.length);
        if (count <= 15) _s = color.delimiter_warning(_s);
        ui.delimiter(pre + ' [' + _s + ']> ');
    },

    setDefaultDelimiter: function(ui, explicit) {
        if (explicit) ui.delimiter('Tweet [140]> ');
        else ui.delimiter('birdknife [---]> ');
    },

    set: function(vorpal, store, api, input, explicit) {
        const self = this;

        var _c, id;

        //if input is a command but not /reply or /quote
        //noinspection OverlyComplexBooleanExpressionJS
        if (input.length === 0 || (
                text.isCommand(input) && !text.isQuote(input) && !text.isReply(input)
            )) {
            this.setDefaultDelimiter(vorpal.ui, explicit);
        }
        else if (!explicit && text.isReply(input)) {
            var reply = text.isReply(input);

            id = reply[1];
            input = input.replace(reply[0], '');
            store.findOne({ id: id }, function(err, doc) {
                if (err) {
                    vorpal.log(color.error('Error: ' + err));
                    return;
                }
                if (!doc || doc.type !== 'status') return;

                input = text.addMentionsToReply(api.ME.screen_name, input, doc.status);
                _c = text.getRemainingTweetLength(input);

                self.setDelimiter(vorpal.ui, _c, false);
            });
        }
        else if (!explicit && text.isQuote(input)) {
            var quote = text.isQuote(input);

            id = quote[1];
            input = input.replace(quote[0], '');
            store.findOne({ id: id }, function(err, doc) {
                if (err) {
                    vorpal.log(color.error('Error: ' + err));
                    return;
                }
                if (!doc || doc.type !== 'status') return;

                input += ' ' + text.getStatusURL(doc.status);
                _c = text.getRemainingTweetLength(input);

                self.setDelimiter(vorpal.ui, _c, false);
            });
        }
        else {
            _c = text.getRemainingTweetLength(input);
            _c -= this.explicit_count;
            this.setDelimiter(vorpal.ui, _c, explicit);
        }
    }
};
