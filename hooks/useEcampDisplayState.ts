import { useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'expo-router';

import { HymnalContext } from '@/constants/context';
import {
    buildEcampDisplayQueryKey,
    fetchEcampDisplayState,
    resolveEcampSongTitle,
    subscribeEcampDisplayRefresh,
} from '@/scripts/ecampDisplay';

const ECAMP_DISPLAY_POLL_MS = 15_000;

function isSettingsRoute(pathname: string): boolean {
    return pathname.includes('(settings)');
}

export function useEcampDisplayState() {
    const context = useContext(HymnalContext);
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const hidden = isSettingsRoute(pathname);
    const bookData = context?.BOOK_DATA ?? {};

    const displayQuery = useQuery({
        queryKey: buildEcampDisplayQueryKey(),
        queryFn: fetchEcampDisplayState,
        enabled: !hidden,
        refetchInterval: ECAMP_DISPLAY_POLL_MS,
        refetchIntervalInBackground: false,
    });

    const [title, setTitle] = useState<string | null>(null);

    useEffect(() => {
        return subscribeEcampDisplayRefresh(() => {
            queryClient.invalidateQueries({ queryKey: buildEcampDisplayQueryKey() });
        });
    }, [queryClient]);

    useEffect(() => {
        const display = displayQuery.data;
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
    }, [displayQuery.data, bookData]);

    return {
        display: displayQuery.data ?? null,
        title,
        hidden,
    };
}
