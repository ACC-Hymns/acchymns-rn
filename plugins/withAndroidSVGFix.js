const { withAppBuildGradle } = require('@expo/config-plugins');

function withAndroidSvgFix(config) {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /android\s*{/, // Find the 'android {' block
      `android {
    configurations {
        all {
            exclude group: "com.caverock", module: "androidsvg"
        }
    }
      `
    );
    return config;
  });
}

module.exports = withAndroidSvgFix;