var vorpal = require('vorpal')();

vorpal.commands = [];

vorpal
    .command('/exit', 'Exit ntwt')
    .action(function(args) {
        args.options = args.options || {};
        args.options.sessionId = this.session.id;
        this.parent.exit(args.options);
    });

vorpal
    .command('/foo', 'Outputs "Bar"')
    .action(function(args, callback) {
        this.log('bar');
        callback();
    });

vorpal
    .delimiter('ntwt>')
    .show();
