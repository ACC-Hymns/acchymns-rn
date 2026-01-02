const { withAppBuildGradle } = require('@expo/config-plugins');

function withGlideFix(config) {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /dependencies\s*{/, // Find the 'dependencies {' block
      `dependencies {
        // FIX: Duplicate classes from Glide (added by custom config plugin)
        configurations.all {
            exclude group: 'com.github.bumptech.glide', module: 'glide'
            exclude group: 'com.github.bumptech.glide', module: 'compiler'
            exclude group: 'com.github.bumptech.glide', module: 'okhttp3-integration'
        }
      `
    );
    // You might also need to remove existing 'implementation' or 'annotationProcessor' lines for Glide
    // if they were explicitly added elsewhere in app/build.gradle.
    // This is harder with a simple replace. You might need to make sure your template doesn't include them.
    return config;
  });
}

module.exports = withGlideFix;