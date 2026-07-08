import { createContext } from 'react';
import { BookSummary, SortMode } from './types';
import type { FeatureFlagOverrides } from '@/scripts/preferences';

interface HymnalContextType {
    BOOK_DATA: Record<string, BookSummary>;
    SET_BOOK_DATA: (bookData: Record<string, BookSummary>) => void;

    featureIntroSeenVersion: string | null;
    setFeatureIntroSeenVersion: (version: string | null) => void;
    discoverPageVisited: boolean | null;
    setDiscoverPageVisited: (discoverPageVisited: boolean | null) => void;
    legacyNumberGrouping: boolean | null;
    setLegacyNumberGrouping: (legacyNumberGrouping: boolean | null) => void;
    languageOverride: string | null;
    setLanguageOverride: (languageOverride: string | null) => void;
    themeOverride: string | null;
    setThemeOverride: (themeOverride: string | null) => void;
    invertSheetMusic: boolean | null;
    setInvertSheetMusic: (invertSheetMusic: boolean | null) => void;
    postHogOptedIn: boolean | null;
    setPostHogOptedIn: (postHogOptedIn: boolean | null) => void;
    broadcastingToken: string | null;
    setBroadcastingToken: (token: string | null) => void;
    broadcastingChurch: string | null;
    setBroadcastingChurch: (church: string | null) => void;
    hymnSignHost: string | null;
    setHymnSignHost: (host: string | null) => void;
    hymnSignPort: number;
    setHymnSignPort: (port: number) => void;
    hymnalReleaseTag: string | null;
    setHymnalReleaseTag: (tag: string | null) => void;
    recommendedHymnBannerEnabled: boolean | null;
    setRecommendedHymnBannerEnabled: (enabled: boolean | null) => void;
    developerMode: boolean | null;
    setDeveloperMode: (enabled: boolean | null) => void;
    featureFlagOverrides: FeatureFlagOverrides | null;
    setFeatureFlagOverride: (flagKey: string, value: boolean | null) => void;
    clearFeatureFlagOverrides: () => void;

    onLayoutHomeView: () => void;
    openDetailsBottomSheet?: () => void;
    setSortMode?: (mode: SortMode) => void;
    deleteHymnal?: (book: string) => Promise<void>;
    resetPreferences: () => Promise<void>;

    setDownloadProgressValues: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    dismissedHymnalPackages: Record<string, true>;
    dismissHymnalPackage: (book: string) => void;
    clearDismissedHymnalPackage: (book: string) => void;
    clearAllDismissedHymnalPackages: () => void;
    completeHymnalPackage: (book: string, digest: string) => Promise<void>;
}

export const HymnalContext = createContext<HymnalContextType | undefined>(undefined);

/** Separate from HymnalContext so frequent progress updates don't re-render the whole app. */
export const DownloadProgressContext = createContext<Record<string, number>>({});

export type { HymnalContextType };