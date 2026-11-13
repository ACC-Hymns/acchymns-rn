import { BookSummary, SongList } from '@/constants/types';
import {
    buildSongSearchIndex,
    filterSongSearch,
    sortSongsByTitle,
    stripSearchText,
    toSongSearchInfo,
} from '@/scripts/songSearch';

const book: BookSummary = {
    name: { short: 'GH', medium: 'Gospel Hymns', long: 'Gospel Hymns' },
    primaryColor: '#000',
    secondaryColor: '#111',
    fileExtension: 'pdf',
    addOn: false,
    indexAvailable: false,
};

const zion: BookSummary = {
    ...book,
    name: { short: 'ZH', medium: 'Zion\'s Harp', long: 'Zion\'s Harp' },
};

describe('stripSearchText', () => {
    it('removes punctuation, case, and diacritics', () => {
        expect(stripSearchText('  Héllo, World!  ')).toBe('  hello world  ');
        expect(stripSearchText('Héllo, World!')).toBe('hello world');
    });

    it('collapses repeated s characters the way search already does', () => {
        expect(stripSearchText('blesssing')).toBe('ble ing');
    });

    it('returns an empty string for missing text', () => {
        expect(stripSearchText(undefined)).toBe('');
        expect(stripSearchText(null)).toBe('');
        expect(stripSearchText('')).toBe('');
    });
});

describe('buildSongSearchIndex', () => {
    const songs: SongList = {
        '12': { title: 'Amazing Grace', first_line: 'Amazing grace' },
        '12a': { title: 'A Mighty Fortress', first_line: 'A mighty fortress' },
    };

    it('skips books that have no song file', () => {
        const index = buildSongSearchIndex(
            { GH: book, ZH: zion },
            { GH: songs, ZH: undefined },
        );

        expect(index.map((song) => song.number)).toEqual(['12', '12a']);
        expect(index.every((song) => song.book.name.short === 'GH')).toBe(true);
    });

    it('stores stripped title and first line', () => {
        const info = toSongSearchInfo(
            { title: 'Noël!', first_line: 'Noël, noël' },
            '3',
            book,
        );

        expect(info.stripped_title).toBe('noel');
        expect(info.stripped_first_line).toBe('noel noel');
        expect(info.number).toBe('3');
    });
});

describe('filterSongSearch', () => {
    const songs = buildSongSearchIndex(
        { GH: book, ZH: zion },
        {
            GH: { '1': { title: 'Amazing Grace', first_line: 'How sweet' } },
            ZH: { '2': { title: 'Grace Alone', first_line: 'Every promise' } },
        },
    );

    it('matches title, first line, and number', () => {
        expect(filterSongSearch(songs, 'amazing').map((song) => song.number)).toEqual(['1']);
        expect(filterSongSearch(songs, 'promise').map((song) => song.number)).toEqual(['2']);
        expect(filterSongSearch(songs, '2').map((song) => song.title)).toEqual(['Grace Alone']);
    });

    it('limits matches to selected hymnals', () => {
        expect(filterSongSearch(songs, 'grace', ['ZH']).map((song) => song.number)).toEqual(['2']);
    });

    it('sorts by cleaned title', () => {
        const sorted = sortSongsByTitle(filterSongSearch(songs, 'grace'));
        expect(sorted.map((song) => song.title)).toEqual(['Amazing Grace', 'Grace Alone']);
    });
});
