var gulp = require('gulp'),
    mocha = require('gulp-mocha'),
    util = require('gulp-util');

gulp.task('test', function() {
    return gulp.src([
            'test/birdknife-parser-test.js',
            'test/birdknife-text-test.js',
            // 'test/TwitterAPITest.js',
            'test/ShortIdGeneratorTest.js'
        ], { read: false })
        .pipe(mocha({ reporter: 'spec' }))
        .on('error', util.log);
});
