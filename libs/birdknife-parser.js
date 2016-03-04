module.exports = {
    parseStatus: function(command, args) {
        if (!command || command.charAt(0) == '/') return command;
        return '\'' + args.replace(/'/g, "&bquot;") + '\'';
    },
    parseCommand: function(command, args) {
        if (!command || command.charAt(0) != '/') return command;
        var c = command.split(' ')[0];
        var arg1 = command.split(' ')[1];
        var s = args.substring(arg1.length + 1); //remove arg1 + whitespace
        return c + ' ' + arg1 + ' ' + '\'' + s.replace(/'/g, "&bquot;") + '\'';
    }
};
