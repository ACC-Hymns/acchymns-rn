import { useContext, useMemo } from 'react';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { HymnalContext } from '@/constants/context';
import { BookSummary } from '@/constants/types';
import {
    fetchHymnalReleaseData,
    getOutdatedHymnals,
    InstalledDigests,
    isHymnalInstalled,
    normalizeDigest,
    releasePreferenceKey,
    RemoteHymnalPackage,
} from '@/scripts/hymnalUpdates';

export type HymnalReleaseCache = {
    release: Awaited<ReturnType<typeof fetchHymnalReleaseData>>['release'];
    resolvedReleaseTag: string;
    bookSummaries: BookSummary[];
    remoteHymnals: RemoteHymnalPackage[];
    installedDigests: InstalledDigests;
};

export type HymnalReleaseData = HymnalReleaseCache & {
    outdatedHymnals: RemoteHymnalPackage[];
};

export { fetchHymnalReleaseData };

export function buildHymnalUpdatesQueryKey(releaseTag: string | null | undefined) {
    return ['hymnal-updates', releasePreferenceKey(releaseTag)] as const;
}

export function optimisticallyMarkHymnalUpToDate(
    queryClient: QueryClient,
    queryKey: ReturnType<typeof buildHymnalUpdatesQueryKey>,
    hymnalId: string,
    digest: string,
) {
    queryClient.setQueryData<HymnalReleaseCache>(queryKey, (current) => {
        if (!current) {
            return current;
        }

        return {
            ...current,
            installedDigests: {
                ...current.installedDigests,
                [hymnalId]: {
                    digest: normalizeDigest(digest),
                    installedAt: new Date().toISOString(),
                },
            },
        };
    });
}

export function useHymnalUpdates(enabled = true) {
    const context = useContext(HymnalContext);
    const installedBookIds = Object.values(context?.BOOK_DATA ?? {}).map((book) => book.name.short);
    const releaseTag = context?.hymnalReleaseTag;

    const query = useQuery({
        queryKey: buildHymnalUpdatesQueryKey(releaseTag),
        queryFn: async () => {
            const result = await fetchHymnalReleaseData(installedBookIds, releaseTag);
            const { outdatedHymnals: _, ...cache } = result;
            return cache;
        },
        enabled,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        staleTime: 5 * 60 * 1000,
        placeholderData: (previousData) => previousData,
    });

    const data = useMemo<HymnalReleaseData | undefined>(() => {
        if (!query.data) {
            return undefined;
        }

        return {
            ...query.data,
            outdatedHymnals: getOutdatedHymnals(
                installedBookIds,
                query.data.remoteHymnals,
                query.data.installedDigests,
            ),
        };
    }, [installedBookIds, query.data]);

    return { ...query, data };
}

export function getAvailableHymnals(
    remoteHymnals: RemoteHymnalPackage[],
    bookData: Record<string, BookSummary>,
): RemoteHymnalPackage[] {
    return remoteHymnals.filter((hymnal) => !isHymnalInstalled(hymnal.id, bookData));
}

export const HYMNAL_SORT_ORDER = [
    'ZH',
    'GH',
    'JH',
    'HZ',
    'CH',
    'HG',
    'ZG',
    'ZGE',
    'HSZ',
    'XC',
    'ZHG',
    'ZHH',
    'ZHJ',
    'ZHR',
    'ZHSP',
    'BS',
    'ES',
    'HS',
    'LDH',
    'MO',
    'PC',
] as const;

export function sortHymnalsByPreferredOrder<T extends { id: string }>(hymnals: T[]): T[] {
    return [...hymnals].sort((a, b) => {
        const aIndex = HYMNAL_SORT_ORDER.indexOf(a.id as typeof HYMNAL_SORT_ORDER[number]);
        const bIndex = HYMNAL_SORT_ORDER.indexOf(b.id as typeof HYMNAL_SORT_ORDER[number]);
        if (aIndex === -1 && bIndex === -1) {
            return a.id.localeCompare(b.id);
        }
        if (aIndex === -1) {
            return 1;
        }
        if (bIndex === -1) {
            return -1;
        }
        return aIndex - bIndex;
    });
}
