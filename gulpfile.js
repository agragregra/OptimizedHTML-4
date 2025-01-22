let syntax     = 'sass', // Syntax - .sass or .scss
		fileswatch = 'html,htm,txt,json,md,woff2', // List of files extensions for watching & hard reload
		gmWatch    = false // true/false GraphicsMagick watching "img/_src" folder.
		                   // Install gm Linux/WSL: sudo apt update; sudo apt install graphicsmagick
		                   // Install gm Git Bash: https://sourceforge.net/projects/graphicsmagick/files/

import pkg from 'gulp'
const { src, dest, parallel, series, watch } = pkg

import browserSync   from 'browser-sync'
import gulpSass      from 'gulp-sass'
import * as dartSass from 'sass'
const  sass          = gulpSass(dartSass)
import postCss       from 'gulp-postcss'
import cssnano       from 'cssnano'
import concat        from 'gulp-concat'
import uglify        from 'gulp-uglify'
import autoprefixer  from 'autoprefixer'
import rsyncModule   from 'gulp-rsync'
import imageResize   from 'gulp-image-resize'
import {deleteAsync} from 'del'

function browsersync() {
	browserSync.init({
		server: {
			baseDir: 'app/'
		},
		ghostMode: { clicks: false },
		notify: false,
		online: true,
		// tunnel: 'yousutename', // Attempt to use the URL https://yousutename.loca.lt
	})
}

function scripts() {
	return src([
		'app/libs/jquery/dist/jquery.min.js',
		'app/js/common.js', // Always at the end
		])
	.pipe(concat('scripts.min.js'))
	// .pipe(uglify()) // Mifify js (opt.)
	.pipe(dest('app/js'))
	.pipe(browserSync.stream())
}

function styles() {
	return src([`app/${syntax}/**/*.${syntax}`])
		.pipe(sass({
			'include css': true,
			silenceDeprecations: ['legacy-js-api', 'mixed-decls', 'color-functions', 'global-builtin', 'import'],
			loadPaths: ['./']
		})).on('error', function handleError() { this.emit('end') })
		.pipe(postCss([
			autoprefixer({ grid: 'autoplace' }),
			cssnano({ preset: ['default', { discardComments: { removeAll: true } }] })
		]))
		.pipe(concat('main.min.css'))
		.pipe(dest('app/css'))
		.pipe(browserSync.stream())
}

function img1x() {
	return src('app/img/_src/**/*.*', { encoding: false })
	.pipe(imageResize({ width: '50%' }))
	.pipe(dest('app/img/@1x/'))
}
function img2x() {
	return src('app/img/_src/**/*.*', { encoding: false })
	.pipe(imageResize({ width: '100%' }))
	.pipe(dest('app/img/@2x/'))
}
async function cleanimg() {
	await deleteAsync('app/img/@*', { force: true })
}

function rsync() {
	return src('app/') // Без звёздочек!
		.pipe(rsyncModule({
			root: 'app/',
			hostname: 'username@yousite.com',
			destination: 'yousite/public_html/',
			clean: true, // Mirror copy with file deletion
			// include: ['*.htaccess'], // Includes files to deploy
			exclude: ['**/Thumbs.db', '**/*.DS_Store'], // Excludes files from deploy
			recursive: true,
			archive: true,
			silent: false,
			compress: true
		}))
}

function startwatch() {
	watch([`app/${syntax}/**/*`], { usePolling: true }, styles)
	watch(['app/js/common.js', 'app/libs/**/*.js'], { usePolling: true }, scripts)
	watch([`app/**/*.{${fileswatch}}`], { usePolling: true }).on('change', browserSync.reload)
	gmWatch && watch(['app/img/_src/**/*'], { usePolling: true }, img) // GraphicsMagick watching image sources if allowed
}

export { scripts, styles, rsync, cleanimg }
export let img = parallel(img1x, img2x)
export let assets = series(img, scripts, styles)

export default gmWatch ? series(img, scripts, styles, parallel(browsersync, startwatch))
                       : series(scripts, styles, parallel(browsersync, startwatch))
