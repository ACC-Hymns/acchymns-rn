import { createContext } from 'react';
import { BookSummary } from './types';

interface HymnalContextType {
    BOOK_DATA: Record<string, BookSummary>;
    SET_BOOK_DATA: (bookData: Record<string, BookSummary>) => void;

    onLayoutHomeView: () => void;
}

export const HymnalContext = createContext<HymnalContextType | undefined>(undefined);
export type { HymnalContextType };