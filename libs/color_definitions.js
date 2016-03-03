var chalk = require('chalk');

module.exports = {
    blue: chalk.blue,
    green: chalk.green,
    bold: chalk.bold,
    yellow: chalk.yellow,

    error: chalk.red,
    success: chalk.green,
    delimiter_warning: chalk.red,
    url: chalk.underline,
    event: chalk.yellow,
    unknown_event: chalk.bgRed,
    dm: chalk.green,
    reply: chalk.red,
    screen_name: chalk.underline.blue,
    my_screen_name: chalk.underline.yellow,
    indented: chalk.green
};
