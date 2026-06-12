const ACCHYMNS_HOSTS = new Set(['acchymns.app', 'www.acchymns.app']);

/**
 * Convert acchymns.app / acchymns:// URLs into Expo Router paths.
 * Mirrors the legacy Capacitor handler: event.url.split(".app").pop()
 */
export function pathFromDeepLink(input: string): string {
    if (!input) {
        return input;
    }

    if (input.startsWith('/') && !input.startsWith('//')) {
        return input;
    }

    try {
        if (input.startsWith('acchymns://')) {
            const url = new URL(input);
            const path = `${url.pathname}${url.search}`;
            return path.startsWith('/') ? path : `/${path}`;
        }

        if (/^https?:\/\//.test(input)) {
            const url = new URL(input);
            if (ACCHYMNS_HOSTS.has(url.hostname)) {
                return `${url.pathname}${url.search}`;
            }

            const legacySlug = input.split('.app').pop();
            if (legacySlug?.startsWith('/')) {
                return legacySlug;
            }
        }
    } catch {
        // Fall through to return the original value.
    }

    return input;
}
