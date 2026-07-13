export const APP_FEATURE_FLAGS = [
    {
        key: 'discover-page',
        label: 'Discover Page',
    },
    {
        key: 'hymnal-cover-images',
        label: 'Hymnal Cover Images',
    },
    {
        key: 'bottom-accessory',
        label: 'Bottom Accessory',
    },
] as const;

export type AppFeatureFlagKey = (typeof APP_FEATURE_FLAGS)[number]['key'];
