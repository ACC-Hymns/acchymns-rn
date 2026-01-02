// plugins/withGradlePropertiesFix.js
const { withGradleProperties } = require('@expo/config-plugins');

function withGradlePropertiesFix(config) {
  return withGradleProperties(config, (config) => {
    config.modResults.contents += '\n'; // Add a newline for safety
    config.modResults.contents += '# FIX: Increase JVM memory allocation for Gradle (added by custom config plugin)\n';

    // Current recommended args for robust builds
    const desiredXmx = '-Xmx6144m'; // Increased to 6GB
    const desiredMetaspace = '-XX:MaxMetaspaceSize=1536m'; // Increased to 1.5GB
    const desiredEncoding = '-Dfile.encoding=UTF-8';

    // This logic ensures we add/update the arguments without duplicating or overwriting
    if (config.modResults.contents.includes('org.gradle.jvmargs=')) {
      config.modResults.contents = config.modResults.contents.replace(
        /org\.gradle\.jvmargs=([^\n]*)/,
        (match, existingArgs) => {
          let updatedArgs = existingArgs;
          if (!updatedArgs.includes('-Xmx')) updatedArgs += ` ${desiredXmx}`;
          if (!updatedArgs.includes('-XX:MaxMetaspaceSize=')) updatedArgs += ` ${desiredMetaspace}`;
          if (!updatedArgs.includes('-Dfile.encoding=')) updatedArgs += ` ${desiredEncoding}`;

          // If the values are present but smaller, you might want to force the higher values.
          // This replacement is simpler and just adds if not present.
          // Forcing values: if Xmx is already there, replace it.
          updatedArgs = updatedArgs.replace(/-Xmx\d+m/, desiredXmx);
          updatedArgs = updatedArgs.replace(/-XX:MaxMetaspaceSize=\d+m/, desiredMetaspace);

          return `org.gradle.jvmargs=${updatedArgs.trim()}`;
        }
      );
    } else {
      config.modResults.contents += `org.gradle.jvmargs=${desiredXmx} ${desiredMetaspace} ${desiredEncoding}\n`;
    }
    return config;
  });
}

module.exports = withGradlePropertiesFix;
