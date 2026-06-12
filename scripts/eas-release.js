#!/usr/bin/env node

/**
 * Build for a platform/profile and submit to the store (cloud or local).
 *
 * Usage:
 *   npm run release -- --platform ios --profile production
 *   npm run release -- -p android --profile production --local
 *   npm run release -- -p ios --profile preview --no-submit
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BUILD_PROFILES = new Set(['development', 'preview', 'production']);
const PLATFORMS = new Set(['ios', 'android']);
const DIST_DIR = path.join(process.cwd(), 'dist', 'eas-release');

function printHelp() {
    console.log(`
Build and submit with EAS (profile must exist in eas.json).

Usage:
  npm run release -- --platform <ios|android> --profile <name> [options]

Options:
  -p, --platform <ios|android>   Required
  --profile <name>               Required (development | preview | production)
  --local                        Build on this machine, then submit the artifact
  --no-submit                    Build only; skip App Store / Play submission
  --interactive                  Allow EAS prompts (default: non-interactive)
  -h, --help                     Show this help

Examples:
  npm run release -- --platform ios --profile production
  npm run release -- -p android --profile production --local
  npm run release -- -p ios --profile preview --no-submit
`);
}

function parseArgs(argv) {
    const result = {
        platform: null,
        profile: null,
        local: false,
        submit: true,
        nonInteractive: true,
        help: false,
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        switch (arg) {
            case '--platform':
            case '-p':
                result.platform = argv[++i];
                break;
            case '--profile':
                result.profile = argv[++i];
                break;
            case '--local':
                result.local = true;
                break;
            case '--no-submit':
                result.submit = false;
                break;
            case '--interactive':
                result.nonInteractive = false;
                break;
            case '--help':
            case '-h':
                result.help = true;
                break;
            default:
                console.error(`Unknown argument: ${arg}`);
                result.help = true;
                break;
        }
    }

    return result;
}

function runEas(args) {
    const result = spawnSync('eas', args, { stdio: 'inherit' });
    if (result.error) {
        console.error(result.error.message);
        console.error('Is eas-cli installed? Try: npm i -g eas-cli');
        process.exit(1);
    }
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

function artifactExtension(platform, profile) {
    if (platform === 'ios') {
        return 'ipa';
    }
    if (profile === 'development') {
        return 'apk';
    }
    return 'aab';
}

function main() {
    const args = parseArgs(process.argv.slice(2));

    if (args.help || !args.platform || !args.profile) {
        printHelp();
        process.exit(args.help ? 0 : 1);
    }

    if (!PLATFORMS.has(args.platform)) {
        console.error(`Invalid platform "${args.platform}". Use ios or android.`);
        process.exit(1);
    }

    if (!BUILD_PROFILES.has(args.profile)) {
        console.error(
            `Invalid profile "${args.profile}". Use one of: ${[...BUILD_PROFILES].join(', ')}.`,
        );
        process.exit(1);
    }

    const easFlags = args.nonInteractive ? ['--non-interactive'] : [];

    if (args.local) {
        fs.mkdirSync(DIST_DIR, { recursive: true });
        const ext = artifactExtension(args.platform, args.profile);
        const outputPath = path.join(DIST_DIR, `build.${ext}`);

        console.log(`\n→ Local EAS build (${args.platform}, profile: ${args.profile})\n`);
        runEas([
            'build',
            '--platform',
            args.platform,
            '--profile',
            args.profile,
            '--local',
            '--output',
            outputPath,
            ...easFlags,
        ]);

        if (!args.submit) {
            console.log(`\n✓ Build saved to ${outputPath}\n`);
            return;
        }

        if (!fs.existsSync(outputPath)) {
            console.error(`Expected artifact not found: ${outputPath}`);
            process.exit(1);
        }

        console.log(`\n→ Submitting ${outputPath}\n`);
        runEas([
            'submit',
            '--platform',
            args.platform,
            '--profile',
            args.profile,
            '--path',
            outputPath,
            ...easFlags,
        ]);
    } else {
        const buildArgs = [
            'build',
            '--platform',
            args.platform,
            '--profile',
            args.profile,
            ...easFlags,
        ];

        if (args.submit) {
            buildArgs.push('--submit');
        }

        console.log(
            `\n→ EAS cloud build (${args.platform}, profile: ${args.profile}${args.submit ? ', auto-submit' : ''})\n`,
        );
        runEas(buildArgs);
    }

    console.log('\n✓ Done\n');
}

main();
