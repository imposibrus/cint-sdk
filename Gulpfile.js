
var gulp = require('gulp'),
    babel = require('gulp-babel');

gulp.task('compile', ['compile:sdk', 'compile:test']);

gulp.task('compile:sdk', function() {
  return gulp.src(['src/index.js'])
      .pipe(babel())
      .pipe(gulp.dest('dst'))
      .on('error', console.error);
});

gulp.task('compile:test', function() {
  return gulp.src(['src/test/index.js'])
      .pipe(babel())
      .pipe(gulp.dest('dst/test'))
      .on('error', console.error);
});

gulp.task('watch', function() {
  return gulp.watch('src/**/*.js', ['compile']);
});

gulp.task('default', ['compile', 'watch']);
