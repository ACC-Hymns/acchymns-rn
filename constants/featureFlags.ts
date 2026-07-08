export const APP_FEATURE_FLAGS = [
    {
        key: 'discover-page',
        label: 'Discover Page',
    },
    {
        key: 'hymnal-cover-images',
        label: 'Hymnal Cover Images',
    },
] as const;

export type AppFeatureFlagKey = (typeof APP_FEATURE_FLAGS)[number]['key'];
