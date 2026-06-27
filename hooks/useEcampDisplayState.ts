import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGlobalSearchParams, usePathname } from 'expo-router';

import { HymnalContext } from '@/constants/context';
import { BookSummary, SongList } from '@/constants/types';
import {
    EcampDisplayState,
    ecampDisplayStateKey,
    ecampDisplayStatesEqual,
    findBookForDisplayRecord,
    findSongNumberInList,
    isViewingEcampSong,
    mergeEcampDisplayState,
} from '@/scripts/ecampDisplay';
import {
    startEcampDisplaySubscription,
    subscribeEcampDisplayState,
} from '@/scripts/ecampDisplaySubscription';
import { getSongData } from '@/scripts/hymnals';

export type EcampSongRoute = {
    bookId: string;
    number: string;
};

function isSettingsRoute(pathname: string): boolean {
    return pathname.includes('(settings)');
}

export function useEcampDisplayState() {
    const context = useContext(HymnalContext);
    const pathname = usePathname();
    const routeParams = useGlobalSearchParams<{ id?: string; number?: string }>();
    const settingsHidden = isSettingsRoute(pathname);
    const bannerEnabled = context?.recommendedHymnBannerEnabled ?? true;
    const [display, setDisplay] = useState<EcampDisplayState | null>(null);
    const [book, setBook] = useState<BookSummary | undefined>();
    const [songs, setSongs] = useState<SongList | null>(null);
    const [songNumber, setSongNumber] = useState<string | null>(null);

    const displayKey = ecampDisplayStateKey(display);

    const handleDisplayUpdate = useCallback((state: EcampDisplayState | null) => {
        if (state === null) {
            setDisplay(null);
            return;
        }

        setDisplay((previous) => {
            const merged = mergeEcampDisplayState(previous, state);
            if (ecampDisplayStatesEqual(previous, merged)) {
                return previous;
            }

            return merged;
        });
    }, []);

    const title = useMemo(() => {
        if (!songs || !songNumber) {
            return null;
        }

        return songs[songNumber]?.title ?? null;
    }, [songNumber, songs]);

    const songRoute = useMemo<EcampSongRoute | null>(() => {
        if (!book || !songNumber) {
            return null;
        }

        return {
            bookId: book.name.short,
            number: songNumber,
        };
    }, [book, songNumber]);

    const hymnalLabel = useMemo(() => {
        if (!display) {
            return null;
        }

        return book?.name.medium ?? display.bookMedium ?? null;
    }, [book, display]);

    const viewingSameSong = useMemo(() => {
        if (!display) {
            return false;
        }

        return isViewingEcampSong(pathname, routeParams, display, songRoute, book);
    }, [book, display, pathname, routeParams, songRoute]);

    useEffect(() => {
        if (settingsHidden || !bannerEnabled) {
            return;
        }

        let releaseSubscription: (() => void) | undefined;
        let cancelled = false;

        startEcampDisplaySubscription()
            .then((release) => {
                if (cancelled) {
                    release();
                    return;
                }
                releaseSubscription = release;
            })
            .catch((error) => {
                console.warn('Failed to start ECAMP display subscription:', error);
            });

        return () => {
            cancelled = true;
            releaseSubscription?.();
        };
    }, [bannerEnabled, settingsHidden]);

    useEffect(() => {
        if (settingsHidden || !bannerEnabled) {
            return;
        }

        return subscribeEcampDisplayState(handleDisplayUpdate);
    }, [bannerEnabled, handleDisplayUpdate, settingsHidden]);

    useEffect(() => {
        if (!display) {
            setBook(undefined);
            setSongs(null);
            setSongNumber(null);
            return;
        }

        const matchedBook = findBookForDisplayRecord(display.bookMedium, context?.BOOK_DATA ?? {});
        setBook(matchedBook);

        if (!matchedBook) {
            setSongs(null);
            setSongNumber(null);
            return;
        }

        let cancelled = false;

        (async () => {
            const songData = await getSongData(matchedBook.name.short);
            if (cancelled || !songData) {
                return;
            }

            const number = findSongNumberInList(songData, display.songNumber);
            if (!number) {
                return;
            }

            setSongs(songData);
            setSongNumber(number);
        })();

        return () => {
            cancelled = true;
        };
    }, [context?.BOOK_DATA, displayKey]);

    return {
        display,
        title,
        book,
        hymnalLabel,
        songRoute,
        hidden: settingsHidden || viewingSameSong || !bannerEnabled,
    };
}
