module.exports = {
    MIN: 360,
    MAX: 1295,
    current: 360,
    generate: function() {
        var _id = this.current.toString(36);
        this.current++;
        return _id;
    }
};
