import { BookSummary } from '@/constants/types';

export type EcampDisplayState = {
    songNumber: string;
    bookMedium: string;
    verses: number[];
};

export function ecampDisplayStateKey(state: EcampDisplayState | null | undefined): string {
    if (!state) {
        return '';
    }

    return `${state.songNumber}|${state.bookMedium}|${state.verses.join(',')}`;
}

export function ecampDisplayStatesEqual(
    left: EcampDisplayState | null | undefined,
    right: EcampDisplayState | null | undefined,
): boolean {
    return ecampDisplayStateKey(left) === ecampDisplayStateKey(right);
}

export function mergeEcampDisplayState(
    previous: EcampDisplayState | null,
    next: EcampDisplayState,
): EcampDisplayState {
    if (!previous) {
        return next;
    }

    return {
        ...next,
        bookMedium: next.bookMedium || previous.bookMedium,
    };
}

export type EcampDisplayMessage =
    | { kind: 'song'; state: EcampDisplayState }
    | { kind: 'clear' }
    | { kind: 'ignore' };

export function parseEcampDisplayMessage(payload: string): EcampDisplayMessage {
    try {
        const message = JSON.parse(payload) as {
            action?: string;
            number?: string | number;
            hymnal?: string;
            verses?: number[];
        };

        if (message.action === 'clear') {
            return { kind: 'clear' };
        }

        if (message.action !== 'song') {
            return { kind: 'ignore' };
        }

        const songNumber = String(message.number ?? '').trim();
        if (!songNumber || songNumber === '---') {
            return { kind: 'ignore' };
        }

        return {
            kind: 'song',
            state: {
                songNumber,
                bookMedium: String(message.hymnal ?? '').trim(),
                verses: Array.isArray(message.verses) ? message.verses : [],
            },
        };
    } catch {
        return { kind: 'ignore' };
    }
}

export function parseEcampCommandPayload(payload: string): EcampDisplayState | null {
    const message = parseEcampDisplayMessage(payload);
    if (message.kind === 'song') {
        return message.state;
    }

    if (message.kind === 'clear') {
        return null;
    }

    return null;
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

export function findSongNumberInList(
    songs: Record<string, { number?: string; title: string }>,
    songNumber: string,
): string | null {
    const normalizedNumber = songNumber.replace(/^0+/, '') || '0';

    if (songs[songNumber]) {
        return songNumber;
    }

    if (songs[normalizedNumber]) {
        return normalizedNumber;
    }

    const match = Object.entries(songs).find(
        ([key, entry]) =>
            key === songNumber
            || (entry.number ?? '').replace(/^0+/, '') === normalizedNumber,
    );

    return match?.[0] ?? null;
}

export function normalizeSongNumber(songNumber: string): string {
    return songNumber.replace(/^0+/, '') || '0';
}

export function isViewingEcampSong(
    pathname: string,
    routeParams: { id?: string | string[]; number?: string | string[] },
    display: EcampDisplayState,
    songRoute: { bookId: string; number: string } | null,
    book?: BookSummary,
): boolean {
    if (!pathname.includes('/display/')) {
        return false;
    }

    const id = Array.isArray(routeParams.id) ? routeParams.id[0] : routeParams.id;
    const number = Array.isArray(routeParams.number) ? routeParams.number[0] : routeParams.number;

    if (!id || !number) {
        return false;
    }

    const normalizedRouteNumber = normalizeSongNumber(number);
    const normalizedDisplayNumber = normalizeSongNumber(display.songNumber);

    if (songRoute) {
        return id === songRoute.bookId
            && normalizedRouteNumber === normalizeSongNumber(songRoute.number);
    }

    if (book && id === book.name.short) {
        return normalizedRouteNumber === normalizedDisplayNumber;
    }

    return false;
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
