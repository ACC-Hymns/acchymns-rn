import { BookSummary } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';

export type EcampDisplayState = {
    songNumber: string;
    bookMedium: string;
    verses: number[];
};

export function parseEcampCommandPayload(payload: string): EcampDisplayState | null {
    try {
        const message = JSON.parse(payload) as {
            action?: string;
            number?: string | number;
            hymnal?: string;
            verses?: number[];
        };

        if (message.action === 'clear') {
            return null;
        }

        if (message.action !== 'song') {
            return null;
        }

        const songNumber = String(message.number ?? '').trim();
        if (!songNumber || songNumber === '---') {
            return null;
        }

        return {
            songNumber,
            bookMedium: String(message.hymnal ?? '').trim(),
            verses: Array.isArray(message.verses) ? message.verses : [],
        };
    } catch {
        return null;
    }
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
