import { useContext, useEffect, useState } from 'react';
import { usePathname } from 'expo-router';

import { HymnalContext } from '@/constants/context';
import {
    EcampDisplayState,
    resolveEcampSongTitle,
} from '@/scripts/ecampDisplay';
import {
    startEcampDisplaySubscription,
    subscribeEcampDisplayState,
} from '@/scripts/ecampDisplaySubscription';

function isSettingsRoute(pathname: string): boolean {
    return pathname.includes('(settings)');
}

export function useEcampDisplayState() {
    const context = useContext(HymnalContext);
    const pathname = usePathname();
    const hidden = isSettingsRoute(pathname);
    const bookData = context?.BOOK_DATA ?? {};
    const [display, setDisplay] = useState<EcampDisplayState | null>(null);
    const [title, setTitle] = useState<string | null>(null);

    useEffect(() => {
        if (hidden) {
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
    }, [hidden]);

    useEffect(() => {
        if (hidden) {
            setDisplay(null);
            return;
        }

        return subscribeEcampDisplayState(setDisplay);
    }, [hidden]);

    useEffect(() => {
        if (!display) {
            setTitle(null);
            return;
        }

        let cancelled = false;

        resolveEcampSongTitle(display, bookData)
            .then((resolvedTitle) => {
                if (!cancelled) {
                    setTitle(resolvedTitle);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setTitle(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [display, bookData]);

    return {
        display,
        title,
        hidden,
    };
}
