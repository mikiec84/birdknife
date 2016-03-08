var schedule = require('node-schedule'),
    color = require('./color_definitions');

module.exports = {
    vorpal: null,
    rule: new schedule.RecurrenceRule(),
    start: function() {
        const self = this;
        this.rule.minute = new schedule.Range(0, 59, 5);

        schedule.scheduleJob(this.rule, function() {
            var time = new Date().toLocaleTimeString().substring(0, 5);


            self.vorpal.log('\n' + color.timer('------------ ' + time + ' ------------') + '\n');
        });
    }
};
