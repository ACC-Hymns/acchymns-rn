import { usePathname } from 'expo-router';

import { isIOS26DesignEnabled } from '@/constants/iosDesign';
import { isDiscoverRoute, isMainTabRoute } from '@/constants/ecampBanner';
import { useAppFeatureFlag, isFeatureFlagEnabled } from '@/hooks/useAppFeatureFlag';
import { useTabBarMediaTrack } from '@/hooks/useTabBarMediaTrack';

export function useTabBarMediaAccessoryVisible(): boolean {
    const pathname = usePathname();
    const ios26DesignEnabled = isIOS26DesignEnabled();
    const bottomAccessoryFlagEnabled = isFeatureFlagEnabled(useAppFeatureFlag('bottom-accessory'));
    const tabBarMediaTrack = useTabBarMediaTrack(
        bottomAccessoryFlagEnabled && ios26DesignEnabled && isMainTabRoute(pathname),
    );

    return Boolean(
        bottomAccessoryFlagEnabled
        && ios26DesignEnabled
        && tabBarMediaTrack
        && !isDiscoverRoute(pathname)
        && isMainTabRoute(pathname),
    );
}
