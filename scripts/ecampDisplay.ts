import type { AttributeValue } from '@aws-sdk/client-dynamodb';

import { ECAMP_CHURCH_ID } from '@/constants/broadcastAuth';
import { BookSummary } from '@/constants/types';
import { get, request_client } from '@/scripts/broadcast';
import { getSongData } from '@/scripts/hymnals';

export type EcampDisplayState = {
    songNumber: string;
    bookMedium: string;
    verses: number[];
};

type RefreshListener = () => void;
const refreshListeners = new Set<RefreshListener>();

export function buildEcampDisplayQueryKey() {
    return ['ecamp-display'] as const;
}

export function subscribeEcampDisplayRefresh(listener: RefreshListener) {
    refreshListeners.add(listener);
    return () => {
        refreshListeners.delete(listener);
    };
}

export function notifyEcampDisplayRefresh() {
    refreshListeners.forEach((listener) => listener());
}

export function parseEcampDisplayItem(
    item: Record<string, AttributeValue> | undefined,
): EcampDisplayState | null {
    if (!item) {
        return null;
    }

    const songNumber = item.SONG_NUMBER?.S?.trim() ?? '';
    const bookMedium = item.BOOK_ID?.S?.trim() ?? '';

    if (!songNumber || songNumber === '---') {
        return null;
    }

    const verses = item.VERSES?.NS?.map((value) => Number(value)) ?? [];

    return {
        songNumber,
        bookMedium,
        verses,
    };
}

export function findBookForDisplayRecord(
    bookMedium: string,
    bookData: Record<string, BookSummary>,
): BookSummary | undefined {
    const normalized = bookMedium.trim().toLowerCase();
    if (!normalized) {
        return undefined;
    }

    return Object.values(bookData).find((book) => {
        const { short, medium, long } = book.name;
        return [short, medium, long].some(
            (value) => value.trim().toLowerCase() === normalized,
        );
    });
}

export async function fetchEcampDisplayState(): Promise<EcampDisplayState | null> {
    const response = await get(request_client(), ECAMP_CHURCH_ID);
    return parseEcampDisplayItem(response.Item);
}

export async function resolveEcampSongTitle(
    display: EcampDisplayState,
    bookData: Record<string, BookSummary>,
): Promise<string | null> {
    const book = findBookForDisplayRecord(display.bookMedium, bookData);
    if (!book) {
        return null;
    }

    const songs = await getSongData(book.name.short);
    if (!songs) {
        return null;
    }

    const normalizedNumber = display.songNumber.replace(/^0+/, '') || '0';
    const song = songs[display.songNumber]
        ?? songs[normalizedNumber]
        ?? Object.values(songs).find(
            (entry) => (entry.number ?? '').replace(/^0+/, '') === normalizedNumber,
        );

    return song?.title ?? null;
}

export function formatEcampSingingLabel(
    display: EcampDisplayState,
    title: string | null,
): string {
    if (title) {
        return `${title} (#${display.songNumber})`;
    }

    return `#${display.songNumber}`;
}
