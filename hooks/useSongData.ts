import { Song } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import { songDataQueryKey } from '@/scripts/songSearch';
import { useQuery } from '@tanstack/react-query';

export function useSongData(book_id: string, number: string): {
    song: Song | undefined,
    loading: boolean,
    error?: string,
    refetch: () => void,
} {
    const query = useQuery({
        queryKey: songDataQueryKey(book_id),
        queryFn: () => getSongData(book_id),
        enabled: Boolean(book_id),
    });

    return {
        song: query.data?.[number],
        loading: query.isLoading,
        error: query.error
            ? (query.error instanceof Error ? query.error.message : String(query.error))
            : undefined,
        refetch: () => {
            void query.refetch();
        },
    };
}
