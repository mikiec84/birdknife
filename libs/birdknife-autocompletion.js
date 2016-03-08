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

        var db;
        switch (word.charAt(0)) {
            case '@':
                db = cache.usernames;
                break;
            case '#':
                db = cache.hashtags;
                break;
            default:
                return;
        }

        db.find({ "k": { $regex: re }}, { k: 1, _id: 0 })
            .limit(4)
            .exec(function(err, docs) {
                if (err) vorpal.log(color.error('Error: ' + err));

                if (!docs || docs.length === 0) return;

                if (docs.length === 1) {
                    var inp;
                    words.pop(); //remove last element
                    if (words.length > 0) {
                        inp = words.join(' ') + ' ' + docs[0].k + ' ';
                    } else {
                        inp = docs[0].k + ' ';
                    }
                    vorpal.ui.input(inp);
                } else {
                    var suggestions = "";
                    for (var i = 0; i < docs.length; i++) {
                        var suggestion = docs[i];
                        suggestions += suggestion.k + ' ';
                    }
                    vorpal.ui.imprint();
                    vorpal.log(suggestions);

                }
            });
    }
};
