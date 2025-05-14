import { createContext } from 'react';
import { BookSummary, SortMode } from './types';

interface HymnalContextType {
    BOOK_DATA: Record<string, BookSummary>;
    SET_BOOK_DATA: (bookData: Record<string, BookSummary>) => void;

    onLayoutHomeView: () => void;
    setSortMode?: (mode: SortMode) => void;

    downloadProgressValues: Record<string, number>;
    setDownloadProgressValues: React.Dispatch<React.SetStateAction<Record<string, number>>>
}

export const HymnalContext = createContext<HymnalContextType | undefined>(undefined);
export type { HymnalContextType };