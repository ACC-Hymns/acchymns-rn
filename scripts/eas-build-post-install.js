#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const platform = process.env.EAS_BUILD_PLATFORM || (process.platform === 'darwin' ? 'ios' : '');
if (platform !== 'ios') {
    process.exit(0);
}

const iosDir = path.join(process.cwd(), 'ios');
console.log('[eas-build-post-install] Running pod install --repo-update');

const result = spawnSync('pod', ['install', '--repo-update'], {
    cwd: iosDir,
    stdio: 'inherit',
    env: {
        ...process.env,
        LANG: 'en_US.UTF-8',
    },
});

if (result.error) {
    console.error('[eas-build-post-install] pod install --repo-update failed:', result.error.message);
    process.exit(1);
}

process.exit(result.status ?? 1);
