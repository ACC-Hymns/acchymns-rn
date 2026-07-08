import React, { useCallback, useContext, useMemo } from 'react';
import { router } from 'expo-router';
import { useAppFeatureFlag, isFeatureFlagEnabled } from '@/hooks/useAppFeatureFlag';

import { FeatureIntroPager } from '@/components/feature-intro/FeatureIntroPager';
import { HymnalContext } from '@/constants/context';
import {
    getCurrentAppVersion,
    useFeatureIntroSlides,
} from '@/hooks/useFeatureIntro';

export default function FeatureIntroScreen() {
    const context = useContext(HymnalContext);
    const discoverPageFlagEnabled = isFeatureFlagEnabled(useAppFeatureFlag('discover-page'));
    const slides = useFeatureIntroSlides(discoverPageFlagEnabled);

    const includesDiscoverSlide = useMemo(
        () => slides.some((slide) => slide.id === 'discover'),
        [slides],
    );

    const finishIntro = useCallback(() => {
        context?.setFeatureIntroSeenVersion(getCurrentAppVersion());
        if (includesDiscoverSlide) {
            context?.setDiscoverPageVisited(true);
        }
        router.replace('/(main)/(tabs)/(home)');
    }, [context, includesDiscoverSlide]);

    return (
        <FeatureIntroPager
            slides={slides}
            onComplete={finishIntro}
            onSkip={finishIntro}
        />
    );
}
