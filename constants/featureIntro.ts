import type { ComponentProps } from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';

export type FeatureIntroSlideId =
    | 'rewrite'
    | 'languages'
    | 'swipe'
    | 'hymnals'
    | 'camp'
    | 'discover';

export type FeatureIntroSlideConfig = {
    id: FeatureIntroSlideId;
    icon: ComponentProps<typeof Ionicons>['name'];
    gradient: readonly [string, string];
    titleKey: string;
    bodyKey: string;
    requiresDiscoverFlag?: boolean;
};

export const FEATURE_INTRO_SLIDES: FeatureIntroSlideConfig[] = [
    {
        id: 'rewrite',
        icon: 'sparkles',
        gradient: ['#007AFF', '#5AC8FA'],
        titleKey: 'featureIntroRewriteTitle',
        bodyKey: 'featureIntroRewriteBody',
    },
    {
        id: 'languages',
        icon: 'language',
        gradient: ['#5856D6', '#AF52DE'],
        titleKey: 'featureIntroLanguagesTitle',
        bodyKey: 'featureIntroLanguagesBody',
    },
    {
        id: 'swipe',
        icon: 'swap-horizontal',
        gradient: ['#34C759', '#30D158'],
        titleKey: 'featureIntroSwipeTitle',
        bodyKey: 'featureIntroSwipeBody',
    },
    {
        id: 'hymnals',
        icon: 'cloud-download',
        gradient: ['#FF9500', '#FFCC00'],
        titleKey: 'featureIntroHymnalsTitle',
        bodyKey: 'featureIntroHymnalsBody',
    },
    {
        id: 'camp',
        icon: 'musical-notes',
        gradient: ['#6E5A72', '#FFB74D'],
        titleKey: 'featureIntroCampTitle',
        bodyKey: 'featureIntroCampBody',
    },
    {
        id: 'discover',
        icon: 'telescope-outline',
        gradient: ['#FF2D55', '#FF6482'],
        titleKey: 'featureIntroDiscoverTitle',
        bodyKey: 'featureIntroDiscoverBody',
        requiresDiscoverFlag: true,
    },
];

export const FEATURE_INTRO_LANGUAGE_CODES = ['en', 'es', 'fr', 'de', 'pt', 'hu', 'sr', 'ja'] as const;
