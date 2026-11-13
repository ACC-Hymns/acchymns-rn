import { Bookmark } from '@/constants/types';

export const BOOKMARKS_KEY = 'bookmarks';
export const LEGACY_BOOKMARKS_KEY = 'CapacitorStorage.bookmarks';

export function parseBookmarks(raw: string | null | undefined): Bookmark[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(isBookmark);
    } catch {
        return [];
    }
}

function isBookmark(value: unknown): value is Bookmark {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const bookmark = value as Partial<Bookmark>;
    return typeof bookmark.book === 'string' && typeof bookmark.number === 'string';
}

export function hasBookmark(bookmarks: Bookmark[], bookmark: Bookmark): boolean {
    return bookmarks.some((item) => item.book === bookmark.book && item.number === bookmark.number);
}

export function addBookmark(bookmarks: Bookmark[], bookmark: Bookmark): Bookmark[] {
    if (hasBookmark(bookmarks, bookmark)) {
        return bookmarks;
    }

    return [...bookmarks, bookmark];
}

export function removeBookmark(bookmarks: Bookmark[], bookmark: Bookmark): Bookmark[] {
    return bookmarks.filter((item) => !(item.book === bookmark.book && item.number === bookmark.number));
}

export function toggleBookmark(bookmarks: Bookmark[], bookmark: Bookmark): Bookmark[] {
    return hasBookmark(bookmarks, bookmark)
        ? removeBookmark(bookmarks, bookmark)
        : addBookmark(bookmarks, bookmark);
}
