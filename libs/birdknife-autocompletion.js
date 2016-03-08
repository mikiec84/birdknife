var text = require('./birdknife-text'),
    color = require('./color_definitions');

module.exports = {
    autocomplete: function(vorpal, cache) {
        var input = vorpal.ui.input();

        if (input.charAt(input.length - 1) == ' ') return;

        var words = input.split(' ');
        var word = words[words.length - 1];

        word = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        var re = new RegExp("^" + word + ".+");

        switch (word.charAt(0)) {
            case '@':
                cache.usernames.find({ "u": { $regex: re }}, { u: 1, _id: 0 })
                    .limit(4)
                    .exec(function(err, docs) {
                        if (err) vorpal.log(color.error('Error: ' + err));

                        if (!docs || docs.length === 0) return;

                        if (docs.length === 1) {
                            var inp;
                            words.pop(); //remove last element
                            if (words.length > 0) {
                                inp = words.join(' ') + ' ' + docs[0].u + ' ';
                            } else {
                                inp = docs[0].u + ' ';
                            }
                            vorpal.ui.input(inp);
                        } else {
                            var suggestions = "";
                            for (var i = 0; i < docs.length; i++) {
                                var suggestion = docs[i];
                                suggestions += suggestion.u + ' ';
                            }
                            vorpal.ui.imprint();
                            vorpal.log(suggestions);

                        }
                    });
                break;

            case '#':
                cache.hashtags.find({ "h": { $regex: re }}, { h:1, _id:0 })
                    .limit(4)
                    .exec(function(err, docs) {
                        if (err) vorpal.log(color.error('Error: ' + err));

                        if (!docs || docs.length === 0) return;

                        if (docs.length === 1) {
                            var inp;
                            words.pop(); //remove last element
                            if (words.length > 0) {
                                inp = words.join(' ') + ' ' + docs[0].h + ' ';
                            } else {
                                inp = docs[0].h + ' ';
                            }
                            vorpal.ui.input(inp);
                        } else {
                            var suggestions = "";
                            for (var i = 0; i < docs.length; i++) {
                                var suggestion = docs[i];
                                suggestions += suggestion.h + ' ';
                            }
                            vorpal.ui.imprint();
                            vorpal.log(suggestions);
                        }
                    });
                break;

            default:
                break;
        }

    }
};
