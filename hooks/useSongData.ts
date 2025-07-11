import { BookIndex, BookSummary, Song, SongList } from "@/constants/types";
import { getBookIndex, getSongData } from "@/scripts/hymnals";
import { useEffect, useState } from "react";

export function useSongData(book_id: string, number: string): {
    song: Song | undefined,
    loading: boolean,
    error?: string 
} {
    const [data, setData] = useState<SongList | undefined>();
    const [indexData, setIndexData] = useState<BookIndex | undefined>();
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | undefined>();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getSongData(book_id);
                console.log('songs', data)
                setData(data);
            } catch (error) {
                setError(error as string);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [book_id]);

    return { song: data?.[number], loading, error };
}
