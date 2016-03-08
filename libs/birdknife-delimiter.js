var color = require('./color_definitions'),
    twitter = require('twitter-text'),
    text = require('./birdknife-text');

module.exports = {
    cache: null,
    PAD: '000',

    setDelimiter: function(ui, count) {
        if (count < 0) count = 0;

        var _s = (this.PAD + count).slice(-this.PAD.length);
        if (count <= 15) _s = color.delimiter_warning(_s);
        ui.delimiter('birdknife [' + _s + ']> ');
    },

    setDefaultDelimiter: function(ui) {
        ui.delimiter('birdknife [---]> ');
    },

    set: function(vorpal, cache, api, input) {
        const self = this;
        this.cache = cache;

        var _c;

        //if input is a command but not /reply or /quote
        //noinspection OverlyComplexBooleanExpressionJS
        if (input.length === 0 || (
                text.isCommand(input) && !text.isQuote(input) && !text.isReply(input)
            )) {
            this.setDefaultDelimiter(vorpal.ui);
        }
        else if (text.isReply(input)) {
            var reply = text.isReply(input);

            var id = reply[1];
            input = input.replace(reply[0], '');
            cache.findOne({ id: id }, function(err, doc) {
                if (doc.type !== 'status') return;
                if (err) {
                    vorpal.log(color.error('Error: ' + err));
                    return;
                }

                input = text.addMentionsToReply(api.ME.screen_name, input, doc.status);
                _c = 140 - twitter.getTweetLength(input);

                self.setDelimiter(vorpal.ui, _c);
            });
        }
        else if (text.isQuote(input)) {
            var quote = text.isQuote(input);

            var id = quote[1];
            input = input.replace(quote[0], '');
            cache.findOne({ id: id }, function(err, doc) {
                if (doc.type !== 'status') return;
                if (err) {
                    vorpal.log(color.error('Error: ' + err));
                    return;
                }

                input += ' ' + text.getStatusURL(doc.status);
                _c = 140 - twitter.getTweetLength(input);

                self.setDelimiter(vorpal.ui, _c);
            });
        }
        else {
            _c = 140 - twitter.getTweetLength(input);
            this.setDelimiter(vorpal.ui, _c);
        }
    }
};
