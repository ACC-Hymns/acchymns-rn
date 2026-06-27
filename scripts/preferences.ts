import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_HYMNSIGN_PORT } from '@/constants/displayCommand';
import { validate_token } from '@/scripts/broadcast';
import {
    ECAMP_CHURCH_ID,
    ECAMP_LOCAL_BROADCAST_TOKEN,
    isLocalBroadcastToken,
} from '@/constants/broadcastAuth';

export const PREFERENCE_KEYS = {
    discoverPageVisited: 'discoverPageVisited',
    legacyNumberGrouping: 'legacyNumberGrouping',
    languageOverride: 'languageOverride',
    postHogOptedIn: 'postHogOptedIn',
    themeOverride: 'themeOverride',
    invertSheetMusic: 'invertSheetMusic',
    broadcastingToken: 'broadcastingToken',
    broadcastingChurch: 'broadcastingChurch',
    hymnSignHost: 'hymnSignHost',
    hymnSignPort: 'hymnSignPort',
    hymnalReleaseTag: 'hymnalReleaseTag',
    recommendedHymnBannerEnabled: 'recommendedHymnBannerEnabled',
} as const;

export type PreferenceKey = keyof typeof PREFERENCE_KEYS;

export type PreferencesState = {
    discoverPageVisited: boolean | null;
    legacyNumberGrouping: boolean | null;
    languageOverride: string | null;
    postHogOptedIn: boolean | null;
    themeOverride: string | null;
    invertSheetMusic: boolean | null;
    broadcastingToken: string | null;
    broadcastingChurch: string | null;
    hymnSignHost: string | null;
    hymnSignPort: number;
    hymnalReleaseTag: string | null;
    recommendedHymnBannerEnabled: boolean | null;
};

export const INITIAL_PREFERENCES: PreferencesState = {
    discoverPageVisited: null,
    legacyNumberGrouping: null,
    languageOverride: null,
    postHogOptedIn: null,
    themeOverride: null,
    invertSheetMusic: null,
    broadcastingToken: null,
    broadcastingChurch: null,
    hymnSignHost: null,
    hymnSignPort: DEFAULT_HYMNSIGN_PORT,
    hymnalReleaseTag: null,
    recommendedHymnBannerEnabled: true,
};

const BOOLEAN_PREFERENCE_KEYS = new Set<PreferenceKey>([
    'discoverPageVisited',
    'legacyNumberGrouping',
    'postHogOptedIn',
    'invertSheetMusic',
    'recommendedHymnBannerEnabled',
]);

function parseStoredValue<K extends PreferenceKey>(
    key: K,
    value: string,
): PreferencesState[K] {
    if (BOOLEAN_PREFERENCE_KEYS.has(key)) {
        return (value === 'true') as PreferencesState[K];
    }
    return value as PreferencesState[K];
}

function serializeValue(value: boolean | string | number): string {
    return typeof value === 'boolean' ? value.toString() : String(value);
}

function parseHymnSignPort(value: string): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HYMNSIGN_PORT;
}

const LEGACY_PREFERENCE_KEYS = new Set(['broadcastTarget']);

export async function loadPreferences(): Promise<PreferencesState> {
    const entries = await AsyncStorage.multiGet(Object.values(PREFERENCE_KEYS));
    const preferences: PreferencesState = { ...INITIAL_PREFERENCES };

    for (const [storageKey, storedValue] of entries) {
        if (storedValue === null || storedValue === '') {
            continue;
        }

        const key = Object.entries(PREFERENCE_KEYS).find(([, value]) => value === storageKey)?.[0] as
            | PreferenceKey
            | undefined;
        if (!key || key === 'broadcastingToken') {
            continue;
        }

        if (LEGACY_PREFERENCE_KEYS.has(storageKey)) {
            continue;
        }

        if (key === 'hymnSignPort') {
            Object.assign(preferences, { hymnSignPort: parseHymnSignPort(storedValue) });
            continue;
        }

        Object.assign(preferences, { [key]: parseStoredValue(key, storedValue) });
    }

    const storedToken = entries.find(([key]) => key === PREFERENCE_KEYS.broadcastingToken)?.[1];
    if (storedToken) {
        if (isLocalBroadcastToken(storedToken)) {
            preferences.broadcastingToken = ECAMP_LOCAL_BROADCAST_TOKEN;
            preferences.broadcastingChurch = ECAMP_CHURCH_ID;
        } else {
            try {
                const response = await validate_token(storedToken);
                preferences.broadcastingToken = response.status === 200 ? storedToken : null;
            } catch (error) {
                console.error('Error validating broadcasting token:', error);
                preferences.broadcastingToken = null;
            }
        }
    }

    if (preferences.recommendedHymnBannerEnabled === null) {
        preferences.recommendedHymnBannerEnabled = true;
    }

    return preferences;
}

export async function savePreferences(preferences: PreferencesState): Promise<void> {
    const entries: [string, string][] = [];
    const keysToRemove: string[] = [];

    for (const key of Object.keys(PREFERENCE_KEYS) as PreferenceKey[]) {
        const value = preferences[key];
        if (value === null) {
            keysToRemove.push(PREFERENCE_KEYS[key]);
        } else if (key === 'hymnSignPort') {
            entries.push([PREFERENCE_KEYS[key], serializeValue(value as number)]);
        } else {
            entries.push([PREFERENCE_KEYS[key], serializeValue(value as boolean | string)]);
        }
    }

    if (entries.length > 0) {
        await AsyncStorage.multiSet(entries);
    }
    if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
    }
}

export async function clearPreferences(): Promise<void> {
    await AsyncStorage.multiSet(
        Object.values(PREFERENCE_KEYS).map((key) => [key, ''] as [string, string]),
    );
}
