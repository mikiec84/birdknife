module.exports = {
    MIN: 360,
    MAX: 1295,
    current: 360,
    s_current: 360,
    generate: function() {
        if (this.current >= this.MAX) this.current = this.MIN;
        var _id = this.current.toString(36);
        this.current++;
        return _id;
    },
    generateSpecial: function(s_key) {
        if (this.s_current >= this.MAX) this.s_current = this.MIN;
        var _id = s_key + this.s_current.toString(36);
        this.s_current++;
        return _id;
    }
};
