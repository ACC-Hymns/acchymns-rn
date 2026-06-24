import { useCallback, useEffect, useState } from 'react';
import {
    clearPreferences,
    INITIAL_PREFERENCES,
    loadPreferences,
    PreferenceKey,
    PreferencesState,
    savePreferences,
} from '@/scripts/preferences';

export function usePreferences() {
    const [preferences, setPreferences] = useState<PreferencesState>(INITIAL_PREFERENCES);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        loadPreferences()
            .then(setPreferences)
            .catch((error) => console.error('Error loading preferences:', error))
            .finally(() => setIsLoaded(true));
    }, []);

    useEffect(() => {
        if (!isLoaded) {
            return;
        }

        savePreferences(preferences).catch((error) =>
            console.error('Error saving preferences:', error),
        );
    }, [preferences, isLoaded]);

    const setPreference = useCallback(<K extends PreferenceKey>(key: K, value: PreferencesState[K]) => {
        setPreferences((current) => ({ ...current, [key]: value }));
    }, []);

    const resetPreferences = useCallback(async () => {
        try {
            await clearPreferences();
            setPreferences(INITIAL_PREFERENCES);
        } catch (error) {
            console.error('Error resetting preferences:', error);
        }
    }, []);

    const setDiscoverPageVisited = useCallback(
        (value: boolean | null) => setPreference('discoverPageVisited', value),
        [setPreference],
    );
    const setLegacyNumberGrouping = useCallback(
        (value: boolean | null) => setPreference('legacyNumberGrouping', value),
        [setPreference],
    );
    const setLanguageOverride = useCallback(
        (value: string | null) => setPreference('languageOverride', value),
        [setPreference],
    );
    const setPostHogOptedIn = useCallback(
        (value: boolean | null) => setPreference('postHogOptedIn', value),
        [setPreference],
    );
    const setThemeOverride = useCallback(
        (value: string | null) => setPreference('themeOverride', value),
        [setPreference],
    );
    const setInvertSheetMusic = useCallback(
        (value: boolean | null) => setPreference('invertSheetMusic', value),
        [setPreference],
    );
    const setBroadcastingToken = useCallback(
        (value: string | null) => setPreference('broadcastingToken', value),
        [setPreference],
    );
    const setBroadcastingChurch = useCallback(
        (value: string | null) => setPreference('broadcastingChurch', value),
        [setPreference],
    );
    const setHymnalReleaseTag = useCallback(
        (value: string | null) => setPreference('hymnalReleaseTag', value),
        [setPreference],
    );

    return {
        ...preferences,
        isPreferencesLoaded: isLoaded,
        setDiscoverPageVisited,
        setLegacyNumberGrouping,
        setLanguageOverride,
        setPostHogOptedIn,
        setThemeOverride,
        setInvertSheetMusic,
        setBroadcastingToken,
        setBroadcastingChurch,
        setHymnalReleaseTag,
        resetPreferences,
    };
}
