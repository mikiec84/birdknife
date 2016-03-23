var schedule = require('node-schedule'),
    color = require('./color_definitions');

module.exports = {
    vorpal: null,
    rule: new schedule.RecurrenceRule(),
    start: function(vorpal, preferences) {
        var ts = preferences.getInteger('timestamp');
        if (!ts || ts <= 0) return;

        this.vorpal = vorpal;
        this.rule.minute = new schedule.Range(0, 59, ts);

        const self = this;

        schedule.scheduleJob(this.rule, function() {
            var time = new Date().toLocaleTimeString().substring(0, 5);


            self.vorpal.log('\n' + color.timer('---------------- ' + time + ' ----------------') + '\n');
        });
    }
};
