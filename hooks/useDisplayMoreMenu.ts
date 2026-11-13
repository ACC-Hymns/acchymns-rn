import { Platform } from 'react-native';
import { Share } from 'react-native';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Bookmark, Song } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import { useI18n } from '@/hooks/useI18n';
import { hasBookmark, toggleBookmark } from '@/scripts/bookmarks';
import { loadBookmarks, saveBookmarks } from '@/scripts/bookmarkStorage';

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

    const toggleSavedBookmark = useCallback(async () => {
        const bookmark = {
            book: bookId,
            number: songId ?? '',
        };
        const nextBookmarks = toggleBookmark(existingBookmarks, bookmark);
        setExistingBookmarks(nextBookmarks);
        setIsBookmarked(hasBookmark(nextBookmarks, bookmark));
        await saveBookmarks(nextBookmarks);
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
        requestIdleCallback(() => {
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

        loadBookmarks().then(setExistingBookmarks);
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
        toggleBookmark: toggleSavedBookmark,
        shareSong,
        openReportIssueAfterMenuCloses,
        bumpNativeMenuKey,
        bumpMenuInstanceId,
        bookmarkLabel: isBookmarked ? i18n.t('removeBookmark') : i18n.t('saveBookmark'),
    };
}
