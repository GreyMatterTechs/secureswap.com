var gulpCopy = require('gulp-copy');

module.exports = function(gulp, callback) {
	return gulp.src(config.theme_assets_source.vendor + '/vendors.min.js')
		.pipe(gulp.dest(config.theme_assets_dest.vendor + '/'));
};