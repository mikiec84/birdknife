class Parser {

    /**
     * Replace problematic chars with placeholders in input
     *
     * @param command
     * @param args
     * @returns {string}
     */
    static parseStatus(command, args) {
        if (!command || command.charAt(0) === '/') return command;

        let res = args.replace(/'/g, '&bquot;');
        res = res.replace(/=/g, '&bequals;');
        return `'${res}'`;
    }

    /**
     * Replace problematic chars with placeholders in commands
     *
     * @param command
     * @param args
     * @returns {string}
     */
    static parseCommand(command, args) {
        if (!command || command.charAt(0) !== '/') return command;

        const c = command.split(' ')[0];
        const arg1 = command.split(' ')[1];
        if (!arg1) return command;

        let s = args.substr(arg1.length + 1); // remove arg1 + whitespace
        s = s.replace(/'/g, '&bquot;');
        s = s.replace(/=/g, '&bequals;');

        return `${c} ${arg1} '${s}'`;
    }

    /**
     * Replace placeholders with their original char value
     *
     * @param string
     * @returns {string}
     */
    static postParse(string) {
        string = string.replace(/&bquot;/g, '\'');
        return string.replace(/&bequals;/g, '=');
    }
}

export default Parser;
