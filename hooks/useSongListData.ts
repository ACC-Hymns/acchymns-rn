import { BookIndex, BookSummary, SongList } from '@/constants/types';
import { getBookIndex, getSongData } from '@/scripts/hymnals';
import { bookIndexQueryKey, songDataQueryKey } from '@/scripts/songSearch';
import { useQuery } from '@tanstack/react-query';

export function useSongListData(bookData: BookSummary | undefined): {
    songs: SongList | undefined,
    topicalIndex?: BookIndex,
    loading: boolean,
    error?: string,
    refetch: () => void,
} {
    const bookId = bookData?.name.short;
    const songsQuery = useQuery({
        queryKey: songDataQueryKey(bookId ?? ''),
        queryFn: () => getSongData(bookId!),
        enabled: Boolean(bookData && bookId),
    });
    const indexQuery = useQuery({
        queryKey: bookIndexQueryKey(bookId ?? ''),
        queryFn: () => getBookIndex(bookId!),
        enabled: Boolean(bookData?.indexAvailable && bookId),
    });

    const refetch = () => {
        void songsQuery.refetch();
        if (bookData?.indexAvailable) {
            void indexQuery.refetch();
        }
    };

    if (!bookData) {
        return { songs: undefined, loading: false, error: 'bookData is undefined', refetch };
    }

    const error = songsQuery.error ?? indexQuery.error;
    const loading = songsQuery.isLoading || (Boolean(bookData.indexAvailable) && indexQuery.isLoading);

    return {
        songs: songsQuery.data ?? undefined,
        topicalIndex: indexQuery.data,
        loading,
        error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
        refetch,
    };
}
