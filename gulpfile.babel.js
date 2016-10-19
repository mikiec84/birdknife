import gulp from 'gulp';
import xo from 'gulp-xo';
import babel from 'gulp-babel';
import mocha from 'gulp-mocha';
import clean from 'gulp-clean';

const paths = {
    srcJs: 'src/**/*.js',
    libTest: 'lib/test/**/*.js',
    gulpFile: 'gulpfile.babel.js',
    cleanDir: 'lib/'
};

gulp.task('lint', () =>
    gulp.src([
        paths.srcJs,
        paths.gulpFile
    ])
        .pipe(xo())
);

gulp.task('clean', () =>
    gulp.src(paths.cleanDir, { read: false })
        .pipe(clean())
);

gulp.task('build', ['lint'], () =>
    gulp.src(paths.srcJs)
        .pipe(babel())
        .pipe(gulp.dest('lib'))
);

gulp.task('set-test-node-env', () => {
    process.env.NODE_ENV = 'test';
});

gulp.task('test', ['build', 'set-test-node-env'], () =>
    gulp.src(paths.libTest)
        .pipe(mocha())
);

gulp.task('default', ['test']);
