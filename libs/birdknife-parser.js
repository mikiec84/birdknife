module.exports = {
    parse: function(command, args) {
        if (!command || command.charAt(0) == '/') return command;
        return '\'' + args.replace(/'/g, "&bquot;") + '\'';
    },
    parseReply: function(command, args) {
        var c = '/reply';
        var id = command.split(' ')[1]; //id is the first word after the command
        var s = args.substring(3); //remove id + whitespace
        return c + ' ' + id + ' ' + '\'' + s.replace(/'/g, "&bquot;") + '\'';
    }
};
