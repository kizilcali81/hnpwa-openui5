module.exports = function(grunt) {
    grunt.initConfig({
      dir:{
          webapp: 'HackerNews/src',
          dist: 'dist'
      },

      clean: {
          "preload": ["src/Component-preload.js", "openui5/**"],
          "openui5": ['src/openui5']
      },
      
      "openui5_preload": {
            component: {
                options: {
                    compress: false,
                    resources: [
                        {
                            cwd: "src",
                            prefix: "sap/ui/demo/hackernews",
                            src: [
                                "Component.js",
                                "**/*.js",
                                "**/*.fragment.xml",
                                "**/*.view.xml",
                                "**/*.properties",
                                "manifest.json",
                                "!sw.js",
                                "!Component-preload.js",
                                "!test/**",
                                "!openui5/**",
                                "!third_party/**"
                            ]
                        },{
                            cwd: "bower_components/openui5-sap.ui.core/resources",
                            src: [
                                "sap/ui/core/messagebundle_en.properties"
                            ]
                        },
                        ,{
                            cwd: "bower_components/openui5-sap.m/resources",
                            src: [
                                "sap/m/messagebundle_en.properties"
                            ]
                        }
                    ],
                    dest: "src"
                },
                components: {
                    "sap/ui/demo/hackernews": {
                        "src": [
                            "sap/ui/demo/hackernews/**",
                            "sap/ui/core/messagebundle_en.properties",
                            "sap/m/messagebundle_en.properties"
                        ]
                    }
                }
            }
        },

        concat: {
            "sap-ui-messagebundle-preload.js": {
                options: {
                    process: function(src, filepath) {
                        var moduleName = filepath.substr(filepath.indexOf("resources/") + "resources/".length);
                        var preloadName = moduleName.replace(/\//g, ".").replace(/\.js$/, "-preload");
                        var preload = {
                            "version": "2.0",
                            "name": preloadName,
                            "modules": {}
                        };
                        preload.modules[moduleName] = src;
                        return "jQuery.sap.registerPreloadedModules(" + JSON.stringify(preload) + ");";
                    }
                },
                src: [
                    "bower_components/openui5-sap.ui.core/resources/sap/ui/core/messagebundle_en.properties",
                    "bower_components/openui5-sap.m/resources/sap/m/messagebundle_en.properties",
                ],
                dest: "src/openui5/resources/sap-ui-messagebundle-preload.js"
            }
        }
    });
  
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-openui5");
    grunt.loadNpmTasks("grunt-contrib-concat");
    
    grunt.registerTask('build', [
        'clean', 
        'openui5_preload', 
        'concat:sap-ui-messagebundle-preload.js',
    ]);
    grunt.registerTask('default', ['build']);
};