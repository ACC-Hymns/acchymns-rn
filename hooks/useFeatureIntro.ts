import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { useMemo } from 'react';
import { FEATURE_INTRO_SLIDES, FeatureIntroSlideConfig } from '@/constants/featureIntro';

export function getCurrentAppVersion(): string {
    return Application.nativeApplicationVersion
        ?? Constants.expoConfig?.version
        ?? '0';
}

export function shouldShowFeatureIntro(seenVersion: string | null | undefined): boolean {
    return seenVersion !== getCurrentAppVersion();
}

export function useFeatureIntroSlides(discoverPageEnabled: boolean): FeatureIntroSlideConfig[] {
    return useMemo(
        () => FEATURE_INTRO_SLIDES.filter(
            (slide) => !slide.requiresDiscoverFlag || discoverPageEnabled,
        ),
        [discoverPageEnabled],
    );
}
