/* eslint-disable import/no-unresolved */

import schedule from 'node-schedule';
import Color from './color-definitions';

class Timer {

    /**
     * Constructor
     *
     * @param vorpal
     * @param preferences
     */
    constructor(vorpal, preferences) {
        this.vorpal = vorpal;
        this.preferences = preferences;
    }

    /**
     * Start the timer
     */
    start() {
        const ts = this.preferences.getInteger('timestamp');
        if (!ts || ts <= 0) return;

        const rule = new schedule.RecurrenceRule();
        rule.minute = new schedule.Range(0, 59, ts);

        schedule.scheduleJob(rule, () => {
            const time = new Date().toLocaleTimeString().substring(0, 5);

            this.vorpal.log(`\n${Color.timer(`---------------- ${time} ----------------`)}\n`);
        });
    }
}

export default Timer;
