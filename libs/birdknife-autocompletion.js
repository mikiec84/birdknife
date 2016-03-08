var text = require('./birdknife-text');

module.exports = {
    autocomplete: function(vorpal) {
        var input = vorpal.ui.input();

        if (input.charAt(input.length - 1) == ' ') return;

        var words = input.split(' ');
        var word = words[words.length - 1];

        switch (word.charAt(0)) {
            case '@':
                vorpal.ui.imprint();
                vorpal.log('@a @b @c');
                break;

            case '#':
                vorpal.ui.imprint();
                vorpal.log('#a #b #c');
                break;

            default:
                break;
        }

    }
};
