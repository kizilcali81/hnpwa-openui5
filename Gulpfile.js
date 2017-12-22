var gulp = require('gulp');
var workbox = require('workbox-build');
 
gulp.task('generate-service-worker', () => {
    return workbox.injectManifest({
        globDirectory: 'src',
        globPatterns: ['**\/*.{html,js,css,svg}'],
        globIgnores: ['controller/**','sw.js','third_party/**'],
        swSrc: 'sw-source.js',
        swDest: `src/sw.js`
    }).then(() => {
      console.info('Service worker generation completed.');
    }).catch((error) => {
      console.warn('Service worker generation failed: ' + error);
    });
});
