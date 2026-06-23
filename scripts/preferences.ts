import AsyncStorage from '@react-native-async-storage/async-storage';
import { validate_token } from '@/scripts/broadcast';

export const PREFERENCE_KEYS = {
    discoverPageVisited: 'discoverPageVisited',
    legacyNumberGrouping: 'legacyNumberGrouping',
    languageOverride: 'languageOverride',
    postHogOptedIn: 'postHogOptedIn',
    themeOverride: 'themeOverride',
    invertSheetMusic: 'invertSheetMusic',
    broadcastingToken: 'broadcastingToken',
    broadcastingChurch: 'broadcastingChurch',
    hymnalReleaseTag: 'hymnalReleaseTag',
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
    hymnalReleaseTag: string | null;
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
    hymnalReleaseTag: null,
};

const BOOLEAN_PREFERENCE_KEYS = new Set<PreferenceKey>([
    'discoverPageVisited',
    'legacyNumberGrouping',
    'postHogOptedIn',
    'invertSheetMusic',
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

function serializeValue(value: boolean | string): string {
    return typeof value === 'boolean' ? value.toString() : value;
}

export async function loadPreferences(): Promise<PreferencesState> {
    const entries = await AsyncStorage.multiGet(Object.values(PREFERENCE_KEYS));
    const preferences: PreferencesState = { ...INITIAL_PREFERENCES };

    for (const [storageKey, storedValue] of entries) {
        if (storedValue === null) {
            continue;
        }

        const key = Object.entries(PREFERENCE_KEYS).find(([, value]) => value === storageKey)?.[0] as
            | PreferenceKey
            | undefined;
        if (!key || key === 'broadcastingToken') {
            continue;
        }

        Object.assign(preferences, { [key]: parseStoredValue(key, storedValue) });
    }

    const storedToken = entries.find(([key]) => key === PREFERENCE_KEYS.broadcastingToken)?.[1];
    if (storedToken) {
        try {
            const response = await validate_token(storedToken);
            preferences.broadcastingToken = response.status === 200 ? storedToken : null;
        } catch (error) {
            console.error('Error validating broadcasting token:', error);
            preferences.broadcastingToken = null;
        }
    }

    return preferences;
}

export async function savePreferences(preferences: PreferencesState): Promise<void> {
    const entries = (Object.keys(PREFERENCE_KEYS) as PreferenceKey[])
        .flatMap((key) => {
            const value = preferences[key];
            return value === null ? [] : [[PREFERENCE_KEYS[key], serializeValue(value)] as [string, string]];
        });

    if (entries.length > 0) {
        await AsyncStorage.multiSet(entries);
    }
}

export async function clearPreferences(): Promise<void> {
    await AsyncStorage.multiSet(
        Object.values(PREFERENCE_KEYS).map((key) => [key, ''] as [string, string]),
    );
}
