import { useContext } from 'react';
import { useFeatureFlag } from 'posthog-react-native';

import { isDeveloperSettingsEnabled } from '@/constants/build';
import { HymnalContext } from '@/constants/context';

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
    const context = useContext(HymnalContext);
    const remoteValue = useFeatureFlag(flagKey);

    if (isDeveloperSettingsEnabled(context?.developerMode)) {
        const override = context?.featureFlagOverrides?.[flagKey];
        if (override !== undefined) {
            return override;
        }
    }

    return remoteValue;
}
