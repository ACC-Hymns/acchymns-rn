import { Platform } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

export const TAB_BAR_HEIGHT = Platform.select({ ios: 49, android: 56, default: 49 }) ?? 49;
export const TAB_BAR_MEDIA_ACCESSORY_HEIGHT = 52;
export const ECAMP_BANNER_GAP = 12;
export const ECAMP_BANNER_MEDIA_ACCESSORY_GAP = 0;
export const ECAMP_BANNER_ESTIMATED_HEIGHT = 72;
export const ECAMP_BANNER_BACK_TO_TOP_GAP = 8;

export function isSettingsRoute(pathname: string): boolean {
    return pathname === '/preferences' || pathname === '/help' 
    || pathname === '/scripture_picker' 
    || pathname === '/broadcast_options' 
    || pathname === '/broadcast_song'
    || pathname === '/broadcast_brightness'
    || pathname === '/broadcast_bible'
    || pathname === '/language'
    || pathname === '/release_tag'
    || pathname === '/broadcast';
}

export function isDiscoverRoute(pathname: string): boolean {
    return pathname === '/discover' || pathname.startsWith('/discover/');
}

export function isEcampBannerRoute(pathname: string): boolean {
    if (pathname.includes('/display/')) {
        return true;
    }

    if (
        isSettingsRoute(pathname)
        || isDiscoverRoute(pathname)
        || pathname.includes('hymnal_importer')
    ) {
        return false;
    }

    return true;
}

export function isMainTabRoute(pathname: string): boolean {
    return !pathname.includes('/display/') && !pathname.includes('hymnal_importer');
}

export function getEcampBannerBottomInset(
    insets: EdgeInsets,
    options: {
        isTabRoute: boolean;
        mediaAccessoryVisible: boolean;
    },
): number {
    if (!options.isTabRoute) {
        return insets.bottom + ECAMP_BANNER_GAP;
    }

    let bottom = insets.bottom + TAB_BAR_HEIGHT + ECAMP_BANNER_GAP;
    if (options.mediaAccessoryVisible) {
        bottom += TAB_BAR_MEDIA_ACCESSORY_HEIGHT + ECAMP_BANNER_MEDIA_ACCESSORY_GAP;
    }

    return bottom;
}

export function getEcampBannerBackToTopBottom(
    bannerBottomInset: number,
    defaultBottom: number,
): number {
    return bannerBottomInset + ECAMP_BANNER_ESTIMATED_HEIGHT + ECAMP_BANNER_BACK_TO_TOP_GAP;
}
