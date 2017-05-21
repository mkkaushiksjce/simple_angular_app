'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var argv = require('yargs').argv;
var path = require('path');
var fs = require('fs');
var config = require('./config/config');
var handlebars = require('gulp-compile-handlebars');
var rename = require('gulp-rename');

/*** configuration values ***/
var WORKPATH = config.WORKPATH,
    BUILDPATH = config.BUILDPATH,
    PRODUCTIONBUILDPATH = config.PRODUCTIONBUILDPATH,
    GITROOT = "../../",
    URLREGEX = /root\/(.*?)(\.png|\.jpg|\.gif|\.woff|\.woff2|\.otf|\.ttf|\.eot|\.html|\.css|\.js|\.svg|\.ico)/gmi,
    GITROOTREGEX = /gitroot(js|css)\/(.*?)(\.css|\.js)/gmi,
    changedFiles = [];
var lessConfig = {
    files: [
        WORKPATH + "less/file_imports.less"
    ],
    dest: "css",
    destFile: "main.css"
};
var scriptLibraryConfig = {
    files: [
        WORKPATH + "common/js_libraries/jquery.js",
        WORKPATH + "common/js_libraries/bootstrap.js",
        WORKPATH + "common/js_libraries/magnific-popup.js",
        WORKPATH + "common/js_libraries/scrollreveal.js",
        WORKPATH + "common/js_libraries/jquery.magnific-popup.js",
    ],
    dest: "js",
    destFile: "libs.js"
};
var scriptAppConfig = {
    files: [
        WORKPATH + "js/app.js",
        WORKPATH + "js/creative.js"
    ],
    dest: "js",
    destFile: "main.js"
};
var imageConfig = {
    files: WORKPATH + "common/images/**/*",
    dest: "common/images"
};
var fontConfig = {
    files: [WORKPATH + 'common/fonts/**/*'],
    dest: "common/fonts"
};

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileLess() {
    gulp.task('less', function () {
        return gulp.src(lessConfig.files)
            .pipe($.less({
                paths: [path.join(__dirname, 'app')]
            }))
            .pipe($.concat(lessConfig.destFile))
            .pipe(gulp.dest(BUILDPATH + lessConfig.dest))
            .pipe($.if(argv.production, $.csso()))
            .pipe($.if(argv.production, gulp.dest(PRODUCTIONBUILDPATH + lessConfig.dest)));
    });
    gulp.watch(lessConfig.files, ['less', reload]);
    return ['less'];
}

function compileScriptLibraries() {
    gulp.task('scriptLib', function () {
        return gulp.src(scriptLibraryConfig.files)
            .pipe($.concat(scriptLibraryConfig.destFile))
            .pipe(gulp.dest(BUILDPATH + scriptLibraryConfig.dest))
            .pipe($.if(argv.production, $.uglify()))
            .pipe($.if(argv.production, gulp.dest(PRODUCTIONBUILDPATH + scriptLibraryConfig.dest)));
    });
    gulp.watch(scriptLibraryConfig.files, ['scriptLib', reload]);
    return ['scriptLib'];
}

function compileScriptApp() {
    gulp.task('scriptApp', function () {
        return gulp.src(scriptAppConfig.files)
            .pipe($.concat(scriptAppConfig.destFile))
            .pipe(gulp.dest(BUILDPATH + scriptAppConfig.dest))
            .pipe($.if(argv.production, $.uglify()))
            .pipe($.if(argv.production, gulp.dest(PRODUCTIONBUILDPATH + scriptAppConfig.dest)));
    });
    gulp.watch(scriptAppConfig.files, ['scriptApp', reload]);
    return ['scriptApp'];
}

function compileViews() {
    gulp.task('view', function () {
        return gulp.src('app/**/*.html')
            .pipe(gulp.dest(BUILDPATH))
            .pipe($.if(argv.production, gulp.dest(PRODUCTIONBUILDPATH)));
    });
    gulp.watch(WORKPATH + '**/*.html', ['view', reload])
    return ['view'];
}

// function compileHandlebars(){
//     gulp.task('handlebars', function(){
//         return gulp.src('app/**/*.hbs')
//         .pipe(handlebars)
//         .pipe(gulp.dest(BUILDPATH))
//         .pipe($.if(argv.production, gulp.dest(PRODUCTIONBUILDPATH)));
//     });
//     gulp.watch(WORKPATH + '**/*.hbs', ['handlebars', reload]);
//     return ['handlebars'];
// }

function compileImages() {
    gulp.task('image', function () {
        return gulp.src(imageConfig.files)
            .pipe(gulp.dest(BUILDPATH + imageConfig.dest))
            .pipe($.if(argv.production, gulp.dest(PRODUCTIONBUILDPATH + imageConfig.dest)));
    });
    gulp.watch(imageConfig.files + ".{png,jpg,svg,ico}", ['image', reload]);
    return ['image'];
}

function compileFonts() {
    gulp.task('font', function () {
        return gulp.src(fontConfig.files)
            .pipe($.changed(BUILDPATH + fontConfig.dest))
            .pipe(gulp.dest(BUILDPATH + fontConfig.dest))
            .pipe($.if(argv.production, gulp.dest(PRODUCTIONBUILDPATH + fontConfig.dest)))
            .pipe($.size({
                title: 'fonts'
            }));
    });
    gulp.watch(fontConfig.files, ['font', reload]);
    return ['font'];
}

function setChangedFiles() {
    // gulp task to check which all file been changed
    gulp.task('compareProduction', function () {
        changedFiles.length = 0;
        return gulp.src(BUILDPATH + "**/*")
            .pipe($.changed('./' + PRODUCTIONBUILDPATH, {
                hasChanged: $.changed.compareSha1Digest
            }))
            .pipe($.data(function (file) {
                if (fs.lstatSync(file.path).isFile()) {
                    changedFiles.push(escapeRegExp(SERVERURL) + '.*?' + escapeRegExp(path.basename(file.path)));
                }
                return file.path;
            }));
    });
    return ['compareProduction'];
}

function runVersion() {
    //gulp task to version urls for which file is changed
    gulp.task('version', function () {
        if (!changedFiles.length) return;
        var regex = new RegExp('(' + changedFiles.join('|') + ')', 'gmi'),
            urlCode = Math.ceil(Math.random() * 10000);

        return gulp.src([BUILDPATH + "**/*.js", BUILDPATH + "**/*.css", BUILDPATH + "**/*.html"])
            .pipe($.replace(regex, '$1?' + urlCode))
            .pipe(gulp.dest(BUILDPATH));
    });
    return 'version';
}

function productionDump() {
    //gulp task for production dump
    gulp.task('productionDump', function () {
        return gulp.src(BUILDPATH + "**/*")
            .pipe(gulp.dest(PRODUCTIONBUILDPATH));
    });
    return 'productionDump';
}
gulp.task('kill', function () {
    if (config.ENVIRONMENT !== "local") {
        process.exit(0);
    }
    next();
});
gulp.task('serve', function () {
    argv.production = config.ENVIRONMENT != "local" ? true : false;
    if (!argv.production) {
        browserSync({
            server: {
                baseDir: argv.production ? PRODUCTIONBUILDPATH : BUILDPATH
            },
            port: config.PORT || 8080,
            open: false
        });
    }
    if (!argv.production) {
        runSequence(
            compileLess()
            .concat(compileScriptLibraries())
            .concat(compileScriptApp())
            .concat(compileViews())
            .concat(compileFonts())
            .concat(compileImages())
        );
    } else {
        runSequence(
            compileLess()
            .concat(compileScriptLibraries())
            .concat(compileScriptApp())
            .concat(compileViews())
            .concat(compileFonts())
            .concat(compileImages()),
            'kill'
        );
    }
});