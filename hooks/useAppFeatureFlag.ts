import { useContext } from 'react';
import { useFeatureFlag } from 'posthog-react-native';

import { isDeveloperSettingsEnabled } from '@/constants/build';
import { PreferencesContext } from '@/hooks/usePreferences';

export function isFeatureFlagEnabled(value: boolean | string | undefined): boolean {
    if (value === undefined) {
        return false;
    }

    if (typeof value === 'boolean') {
        return value;
    }

    if (value === 'true') {
        return true;
    }

    if (value === 'false') {
        return false;
    }

    return Boolean(value);
}

export function useAppFeatureFlag(flagKey: string): boolean | string | undefined {
    const preferences = useContext(PreferencesContext);
    const remoteValue = useFeatureFlag(flagKey);

    if (isDeveloperSettingsEnabled(preferences?.developerMode)) {
        const override = preferences?.featureFlagOverrides?.[flagKey];
        if (override !== undefined) {
            return override;
        }
    }

    return remoteValue;
}
