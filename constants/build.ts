import * as Updates from 'expo-updates';

export function isDevelopmentOrPreviewBuild(): boolean {
    if (__DEV__) {
        return true;
    }

    const channel = Updates.channel;
    return channel === 'development' || channel === 'preview';
}

export function isDeveloperSettingsEnabled(developerMode: boolean | null | undefined): boolean {
    return isDevelopmentOrPreviewBuild() || Boolean(developerMode);
}
