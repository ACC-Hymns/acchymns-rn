import React, { useCallback, useContext, useMemo } from 'react';
import { router } from 'expo-router';
import { useFeatureFlag } from 'posthog-react-native';

import { FeatureIntroPager } from '@/components/feature-intro/FeatureIntroPager';
import { HymnalContext } from '@/constants/context';
import {
    getCurrentAppVersion,
    useFeatureIntroSlides,
} from '@/hooks/useFeatureIntro';

export default function FeatureIntroScreen() {
    const context = useContext(HymnalContext);
    const discoverPageFlagEnabled = useFeatureFlag('discover-page');
    const slides = useFeatureIntroSlides(Boolean(discoverPageFlagEnabled));

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
