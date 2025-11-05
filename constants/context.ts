import { createContext } from 'react';
import { BookSummary, SortMode } from './types';

interface HymnalContextType {
    BOOK_DATA: Record<string, BookSummary>;
    SET_BOOK_DATA: (bookData: Record<string, BookSummary>) => void;

    discoverPageVisited: boolean | null;
    setDiscoverPageVisited: (discoverPageVisited: boolean) => void;
    legacyNumberGrouping: boolean | null;
    setLegacyNumberGrouping: (legacyNumberGrouping: boolean) => void;
    languageOverride: string | null;
    setLanguageOverride: (languageOverride: string) => void;
    themeOverride: string | null;
    setThemeOverride: (themeOverride: string) => void;
    invertSheetMusic: boolean | null;
    setInvertSheetMusic: (invertSheetMusic: boolean) => void;
    postHogOptedIn: boolean | null;
    setPostHogOptedIn: (postHogOptedIn: boolean) => void;
    broadcastingToken: string | null;
    setBroadcastingToken: (token: string | null) => void;
    broadcastingChurch: string | null;
    setBroadcastingChurch: (church: string | null) => void;

    onLayoutHomeView: () => void;
    openDetailsBottomSheet?: () => void;
    setSortMode?: (mode: SortMode) => void;
    deleteHymnal?: (book: string) => Promise<void>;

    downloadProgressValues: Record<string, number>;
    setDownloadProgressValues: React.Dispatch<React.SetStateAction<Record<string, number>>>
}

export const HymnalContext = createContext<HymnalContextType | undefined>(undefined);
export type { HymnalContextType };