import { usePathname } from 'expo-router';

import { isIOS26DesignEnabled } from '@/constants/iosDesign';
import { isDiscoverRoute, isMainTabRoute } from '@/constants/ecampBanner';
import { useTabBarMediaTrack } from '@/hooks/useTabBarMediaTrack';

export function useTabBarMediaAccessoryVisible(): boolean {
    const pathname = usePathname();
    const ios26DesignEnabled = isIOS26DesignEnabled();
    const tabBarMediaTrack = useTabBarMediaTrack(ios26DesignEnabled && isMainTabRoute(pathname));

    return Boolean(
        ios26DesignEnabled
        && tabBarMediaTrack
        && !isDiscoverRoute(pathname)
        && isMainTabRoute(pathname),
    );
}
