import { Bookmark } from '@/constants/types';
import {
    addBookmark,
    hasBookmark,
    parseBookmarks,
    removeBookmark,
    toggleBookmark,
} from '@/scripts/bookmarks';

const grace: Bookmark = { book: 'GH', number: '12' };
const zion: Bookmark = { book: 'ZH', number: '4' };

describe('parseBookmarks', () => {
    it('returns bookmarks from stored json', () => {
        expect(parseBookmarks(JSON.stringify([grace, zion]))).toEqual([grace, zion]);
    });

    it('drops malformed entries and invalid payloads', () => {
        expect(parseBookmarks(JSON.stringify([grace, { book: 'GH' }, null, 'nope']))).toEqual([grace]);
        expect(parseBookmarks('not-json')).toEqual([]);
        expect(parseBookmarks(null)).toEqual([]);
        expect(parseBookmarks(JSON.stringify({ book: 'GH', number: '1' }))).toEqual([]);
    });
});

describe('bookmark edits', () => {
    it('adds, detects, and removes without mutating the original list', () => {
        const original = [grace];
        const added = addBookmark(original, zion);

        expect(added).toEqual([grace, zion]);
        expect(original).toEqual([grace]);
        expect(hasBookmark(added, zion)).toBe(true);
        expect(removeBookmark(added, grace)).toEqual([zion]);
    });

    it('toggles a bookmark off when it already exists', () => {
        expect(toggleBookmark([grace], grace)).toEqual([]);
        expect(toggleBookmark([], grace)).toEqual([grace]);
        expect(addBookmark([grace], grace)).toEqual([grace]);
    });
});
