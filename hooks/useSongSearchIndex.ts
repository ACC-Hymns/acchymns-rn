import { useMemo } from 'react';
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookSummary, SongList } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import {
    bookIndexQueryKey,
    buildSongSearchIndex,
    songDataQueryKey,
    songSearchIndexQueryKey,
} from '@/scripts/songSearch';

export function useSongSearchIndex(books: Record<string, BookSummary> | undefined) {
    const queryClient = useQueryClient();
    const bookIds = useMemo(
        () => Object.keys(books ?? {}).filter((id) => books?.[id] != undefined).sort(),
        [books],
    );

    return useQuery({
        queryKey: songSearchIndexQueryKey(bookIds),
        enabled: books != undefined && bookIds.length > 0,
        queryFn: async () => {
            const songsByBook: Record<string, SongList | undefined> = {};
            for (const id of bookIds) {
                songsByBook[id] = await queryClient.fetchQuery({
                    queryKey: songDataQueryKey(id),
                    queryFn: () => getSongData(id),
                });
            }

            return buildSongSearchIndex(books ?? {}, songsByBook);
        },
    });
}

export function invalidateSongCatalog(queryClient: QueryClient, bookId?: string) {
    const songDataKey = bookId ? songDataQueryKey(bookId) : ['song-data'];
    const bookIndexKey = bookId ? bookIndexQueryKey(bookId) : ['book-index'];

    return Promise.all([
        queryClient.invalidateQueries({ queryKey: songDataKey }),
        queryClient.invalidateQueries({ queryKey: bookIndexKey }),
        queryClient.invalidateQueries({ queryKey: ['song-search-index'] }),
    ]);
}

export function removeSongCatalog(queryClient: QueryClient, bookId?: string) {
    const songDataKey = bookId ? songDataQueryKey(bookId) : ['song-data'];
    const bookIndexKey = bookId ? bookIndexQueryKey(bookId) : ['book-index'];

    queryClient.removeQueries({ queryKey: songDataKey });
    queryClient.removeQueries({ queryKey: bookIndexKey });
    if (!bookId) {
        queryClient.removeQueries({ queryKey: ['song-search-index'] });
    }
}
