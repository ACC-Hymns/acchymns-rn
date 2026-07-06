import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { getEcampBannerScrollContentInset } from '@/constants/ecampBanner';
import { useEcampDisplayState } from '@/hooks/useEcampDisplayState';

export function useEcampBannerScrollContentInset(baseInset = 0) {
    const { display, hidden } = useEcampDisplayState();
    const { width, height } = useWindowDimensions();

    return useMemo(
        () => getEcampBannerScrollContentInset(
            Boolean(display) && !hidden,
            width > height,
            baseInset,
        ),
        [display, hidden, width, height, baseInset],
    );
}
