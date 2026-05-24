// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('@expo/metro-config/file-store');

const {
    wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Per-project cache (avoids corrupt/truncated entries in the shared OS tmpdir metro-cache).
config.cacheStores = [
    new FileStore({
        root: path.join(__dirname, 'node_modules/.cache/metro'),
    }),
];

const { transformer, resolver } = config;
const ioniconsPath = path.resolve(
    __dirname,
    'node_modules/react-native-vector-icons/Ionicons.js',
);

config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};
config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...resolver.sourceExts, 'svg'],
    resolveRequest: (context, moduleName, platform) => {
        if (moduleName === 'react-native-vector-icons/ionicons') {
            return { type: 'sourceFile', filePath: ioniconsPath };
        }
        if (resolver.resolveRequest) {
            return resolver.resolveRequest(context, moduleName, platform);
        }
        return context.resolveRequest(context, moduleName, platform);
    },
};

module.exports = wrapWithReanimatedMetroConfig(config);
