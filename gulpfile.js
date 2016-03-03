var gulp = require('gulp'),
    mocha = require('gulp-mocha'),
    util = require('gulp-util');

gulp.task('test', function() {
    return gulp.src(['test/*.js'], { read: false })
        .pipe(mocha({ reporter: 'spec' }))
        .on('error', util.log);
});
