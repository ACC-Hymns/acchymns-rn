import { InteractionManager, Platform } from 'react-native';
import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Bookmark, Song } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import { useI18n } from '@/hooks/useI18n';

const BOOKMARKS_KEY = 'bookmarks';

type UseDisplayMoreMenuOptions = {
    bookId: string;
    songId?: string;
    onReportIssuePress?: () => void;
};

export function useDisplayMoreMenu({
    bookId,
    songId,
    onReportIssuePress,
}: UseDisplayMoreMenuOptions) {
    const i18n = useI18n();
    const [existingBookmarks, setExistingBookmarks] = useState<Bookmark[]>([]);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [nativeMenuKey, setNativeMenuKey] = useState(0);
    const [menuInstanceId, setMenuInstanceId] = useState(0);
    const [songData, setSongData] = useState<Song | null>(null);
    const reportOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const addBookmark = async (bookmark: Bookmark) => {
        try {
            const bookmarks: Bookmark[] = existingBookmarks ?? [];
            const exists = bookmarks.some(
                (b) => b.book === bookmark.book && b.number === bookmark.number,
            );
            if (exists) {
                await removeBookmark(bookmark);
                return;
            }
            bookmarks.push(bookmark);
            await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
            setExistingBookmarks(bookmarks);
            setIsBookmarked(true);
        } catch (error) {
            console.error('Error saving bookmarks:', error);
        }
    };

    const removeBookmark = async (bookmark: Bookmark) => {
        try {
            const bookmarks: Bookmark[] = existingBookmarks ?? [];
            const updatedBookmarks = bookmarks.filter(
                (b) => !(b.book === bookmark.book && b.number === bookmark.number),
            );
            await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updatedBookmarks));
            setExistingBookmarks(updatedBookmarks);
            setIsBookmarked(false);
        } catch (error) {
            console.error('Error removing bookmark:', error);
        }
    };

    const toggleBookmark = useCallback(async () => {
        await addBookmark({
            book: bookId,
            number: songId ?? '',
        });
    }, [bookId, songId, existingBookmarks]);

    const shareSong = useCallback(async () => {
        await Share.share({
            title: `${songData?.title}`,
            message: `https://acchymns.app/display/${bookId}/${songId}`,
        });
    }, [bookId, songId, songData?.title]);

    const clearPendingReportOpen = useCallback(() => {
        if (reportOpenTimeoutRef.current) {
            clearTimeout(reportOpenTimeoutRef.current);
            reportOpenTimeoutRef.current = null;
        }
    }, []);

    const openReportIssueAfterMenuCloses = useCallback(() => {
        InteractionManager.runAfterInteractions(() => {
            clearPendingReportOpen();
            setNativeMenuKey((k) => k + 1);
            const delay = Platform.OS === 'ios' ? 350 : 120;
            reportOpenTimeoutRef.current = setTimeout(() => {
                reportOpenTimeoutRef.current = null;
                onReportIssuePress?.();
            }, delay);
        });
    }, [clearPendingReportOpen, onReportIssuePress]);

    useLayoutEffect(() => {
        if (!songId) {
            return;
        }

        getSongData(bookId).then((data) => {
            if (!data) {
                return;
            }
            setSongData(data[songId]);
        });

        AsyncStorage.getItem(BOOKMARKS_KEY).then((data) => {
            setExistingBookmarks(JSON.parse(data || '[]'));
        });
    }, [bookId, songId]);

    useEffect(() => {
        if (songData && existingBookmarks) {
            const bookmarked = existingBookmarks.some(
                (b) => b.book === bookId && b.number === songId,
            );
            setIsBookmarked(bookmarked);
        }
    }, [songData, existingBookmarks, bookId, songId]);

    useEffect(() => {
        return () => {
            clearPendingReportOpen();
        };
    }, [clearPendingReportOpen]);

    const bumpNativeMenuKey = useCallback(() => {
        setNativeMenuKey((k) => k + 1);
    }, []);

    const bumpMenuInstanceId = useCallback(() => {
        setMenuInstanceId((id) => id + 1);
    }, []);

    return {
        i18n,
        isBookmarked,
        songData,
        nativeMenuKey,
        menuInstanceId,
        toggleBookmark,
        shareSong,
        openReportIssueAfterMenuCloses,
        bumpNativeMenuKey,
        bumpMenuInstanceId,
        bookmarkLabel: isBookmarked ? i18n.t('removeBookmark') : i18n.t('saveBookmark'),
    };
}
