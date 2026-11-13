import { BookSummary, Song, SongList, SongSearchInfo } from '@/constants/types';

const SEARCH_PUNCTUATION = /[.,/#!$%^&*;:{}=\-_'’"`~()]/g;
const SORT_PUNCTUATION = /[.,/#!$%^&*;:{}=\-_'"`~()]/g;

export function stripSearchText(text: string | null | undefined): string {
    if (!text) {
        return '';
    }

    return text
        .replace(SEARCH_PUNCTUATION, '')
        .replace(/s{2,}/g, ' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
}

export function cleanTitleForSort(title: string): string {
    return title.replace(SORT_PUNCTUATION, '');
}

export function toSongSearchInfo(song: Song, number: string, book: BookSummary): SongSearchInfo {
    return {
        ...song,
        stripped_title: stripSearchText(song.title ?? ''),
        stripped_first_line: stripSearchText(song.first_line ?? ''),
        title: song.title,
        first_line: song.first_line,
        number,
        book,
    };
}

export function buildSongSearchIndex(
    books: Record<string, BookSummary>,
    songsByBook: Record<string, SongList | undefined | null>,
): SongSearchInfo[] {
    const index: SongSearchInfo[] = [];

    for (const id of Object.keys(books)) {
        const book = books[id];
        const songs = songsByBook[id];
        if (!book || !songs) {
            continue;
        }

        for (const number of Object.keys(songs)) {
            index.push(toSongSearchInfo(songs[number], number, book));
        }
    }

    return index;
}

export function songMatchesQuery(song: SongSearchInfo, rawQuery: string): boolean {
    const query = stripSearchText(rawQuery);
    if (!query) {
        return true;
    }

    return Boolean(
        song.stripped_title?.includes(query)
        || song.stripped_first_line?.includes(query)
        || song.number == query,
    );
}

export function filterSongSearch(
    songs: SongSearchInfo[],
    rawQuery: string,
    selectedHymnals: string[] = [],
): SongSearchInfo[] {
    return songs.filter((song) => {
        const matchesHymnal = selectedHymnals.length === 0
            || selectedHymnals.includes(song.book.name.short);
        return matchesHymnal && songMatchesQuery(song, rawQuery);
    });
}

export function sortSongsByTitle<T extends { title: string }>(songs: T[]): T[] {
    return [...songs].sort((a, b) =>
        cleanTitleForSort(a.title).localeCompare(cleanTitleForSort(b.title)),
    );
}

export function songDataQueryKey(bookId: string) {
    return ['song-data', bookId] as const;
}

export function bookIndexQueryKey(bookId: string) {
    return ['book-index', bookId] as const;
}

export function songSearchIndexQueryKey(bookIds: readonly string[]) {
    return ['song-search-index', [...bookIds].sort()] as const;
}
