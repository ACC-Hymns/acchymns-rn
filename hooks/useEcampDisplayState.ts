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
import { isEcampBannerRoute } from '@/constants/ecampBanner';
import {
    dismissEcampBanner,
    getDismissedEcampDisplayKey,
    isEcampBannerDismissedForDisplay,
    subscribeEcampBannerDismiss,
    syncEcampBannerDismissForDisplayKey,
} from '@/scripts/ecampBannerDismiss';

const LOG_PREFIX = '[ECAMP Subscribe]';

function logHook(message: string, details?: Record<string, unknown>) {
    if (details) {
        console.log(LOG_PREFIX, message, details);
        return;
    }

    console.log(LOG_PREFIX, message);
}

export type EcampSongRoute = {
    bookId: string;
    number: string;
};

export function useEcampDisplayState() {
    const context = useContext(HymnalContext);
    const pathname = usePathname();
    const routeParams = useGlobalSearchParams<{ id?: string; number?: string }>();
    const routeHidden = !isEcampBannerRoute(pathname);
    const bannerEnabled = context?.recommendedHymnBannerEnabled ?? true;
    const [display, setDisplay] = useState<EcampDisplayState | null>(null);
    const [dismissedDisplayKey, setDismissedDisplayKey] = useState<string | null>(
        getDismissedEcampDisplayKey(),
    );
    const [book, setBook] = useState<BookSummary | undefined>();
    const [songs, setSongs] = useState<SongList | null>(null);
    const [songNumber, setSongNumber] = useState<string | null>(null);

    const displayKey = ecampDisplayStateKey(display);
    const userDismissed = isEcampBannerDismissedForDisplay(display);

    const dismissBanner = useCallback(() => {
        if (!display) {
            return;
        }

        dismissEcampBanner(display);
    }, [display]);

    useEffect(() => subscribeEcampBannerDismiss(setDismissedDisplayKey), []);

    useEffect(() => {
        syncEcampBannerDismissForDisplayKey(displayKey);
    }, [displayKey]);

    const handleDisplayUpdate = useCallback((state: EcampDisplayState | null) => {
        logHook('hook received display update', {
            state: state
                ? {
                    songNumber: state.songNumber,
                    bookMedium: state.bookMedium,
                    key: ecampDisplayStateKey(state),
                }
                : null,
        });

        if (state === null) {
            setDisplay(null);
            return;
        }

        setDisplay((previous) => {
            const merged = mergeEcampDisplayState(previous, state);
            if (ecampDisplayStatesEqual(previous, merged)) {
                logHook('hook display unchanged after merge', {
                    key: ecampDisplayStateKey(merged),
                });
                return previous;
            }

            logHook('hook display updated', {
                previousKey: ecampDisplayStateKey(previous),
                nextKey: ecampDisplayStateKey(merged),
            });
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

        return isViewingEcampSong(
            pathname,
            routeParams,
            display,
            songRoute,
            book,
            context?.BOOK_DATA,
        );
    }, [book, context?.BOOK_DATA, display, pathname, routeParams, songRoute]);

    useEffect(() => {
        logHook('hook mount/update', {
            bannerEnabled,
            routeHidden,
            pathname,
            displayKey,
        });
    }, [bannerEnabled, displayKey, pathname, routeHidden]);

    useEffect(() => {
        if (!bannerEnabled) {
            logHook('subscription not started, banner disabled');
            return;
        }

        logHook('starting MQTT subscription');
        let releaseSubscription: (() => void) | undefined;
        let cancelled = false;

        startEcampDisplaySubscription()
            .then((release) => {
                if (cancelled) {
                    logHook('subscription started after unmount, releasing immediately');
                    release();
                    return;
                }
                releaseSubscription = release;
                logHook('subscription started');
            })
            .catch((error) => {
                logHook('subscription start failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
            });

        return () => {
            cancelled = true;
            if (releaseSubscription) {
                logHook('releasing MQTT subscription');
                releaseSubscription();
            }
        };
    }, [bannerEnabled]);

    useEffect(() => {
        if (!bannerEnabled) {
            logHook('state listener not registered, banner disabled');
            return;
        }

        logHook('registering state listener');
        return subscribeEcampDisplayState(handleDisplayUpdate);
    }, [bannerEnabled, handleDisplayUpdate]);

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
        displayKey,
        title,
        book,
        hymnalLabel,
        songRoute,
        viewingSameSong,
        userDismissed,
        dismissBanner,
        hidden: routeHidden || !bannerEnabled || viewingSameSong || userDismissed,
    };
}
