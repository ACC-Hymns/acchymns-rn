import { pathFromDeepLink } from '@/scripts/deepLink';

/**
 * Normalize native URLs before Expo Router resolves them.
 * - Universal/App links: https://acchymns.app/display/CH/100 → /display/CH/100
 * - Custom scheme: acchymns://display/CH/100 → /display/CH/100
 * - TrackPlayer: ignore synthetic notification deep links
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
    try {
        const url = new URL(path, 'acchymns://');
        if (url.protocol === 'trackplayer:' && url.host === 'notification.click') {
            return '';
        }
    } catch {
        // If parsing fails, continue with path normalization below.
    }

    return pathFromDeepLink(path);
}
