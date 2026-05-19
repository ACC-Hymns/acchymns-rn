/**
 * Normalize native URLs before Expo Router resolves them.
 * TrackPlayer on Android can emit trackplayer://notification.click when
 * the media notification is tapped; without handling this, Expo Router
 * falls through to the not-found screen.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
    try {
        const url = new URL(path, 'myapp://');
        if (url.protocol === 'trackplayer:' && url.host === 'notification.click') {
            // Ignore TrackPlayer's synthetic deep-link so notification taps just
            // bring the app to foreground without navigation.
            return '';
        }
    } catch {
        // If parsing fails, keep the original path and let Expo Router handle it.
    }

    return path;
}
