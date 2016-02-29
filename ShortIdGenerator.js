module.exports = {
    MIN: 360,
    MAX: 1295,
    current: 360,
    generate: function() {
        if (this.current >= this.MAX) this.current = this.MIN;
        var _id = this.current.toString(36);
        this.current++;
        return _id;
    }
};
