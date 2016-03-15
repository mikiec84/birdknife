module.exports = {
    parseStatus: function(command, args) {
        if (!command || command.charAt(0) == '/') return command;
        var res = args.replace(/'/g, "&bquot;");
        res = res.replace(/=/g, "&bequals;");
        return '\'' + res + '\'';
    },
    parseCommand: function(command, args) {
        if (!command || command.charAt(0) != '/') return command;
        var c = command.split(' ')[0];
        var arg1 = command.split(' ')[1];
        if (!arg1) return command;
        var s = args.substring(arg1.length + 1); //remove arg1 + whitespace
        s = s.replace(/'/g, "&bquot;");
        s = s.replace(/=/g, "&bequals;");
        return c + ' ' + arg1 + ' ' + '\'' + s + '\'';
    },
    postParse: function(string) {
        var _s = string.replace(/&bquot;/g, "'");
        _s = _s.replace(/&bequals;/g, "=");
        return _s;
    }
};
