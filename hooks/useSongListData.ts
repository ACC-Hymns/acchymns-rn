import { BookIndex, BookSummary, SongList } from "@/constants/types";
import { getBookIndex, getSongData } from "@/scripts/hymnals";
import { useEffect, useState } from "react";

export function useSongListData(bookData: BookSummary | undefined): {
    songs: SongList | undefined,
    topicalIndex?: BookIndex,
    loading: boolean,
    error?: string 
} {
    const [data, setData] = useState<SongList | undefined>();
    const [indexData, setIndexData] = useState<BookIndex | undefined>();
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | undefined>();

    if(!bookData)
        return { songs: undefined, loading: false, error: "bookData is undefined" }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getSongData(bookData.name.short);
                setData(data);
                if (bookData.indexAvailable) {
                    const index = await getBookIndex(bookData.name.short);
                    setIndexData(index);
                }
            } catch (error) {
                setError(error as string);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [bookData]);

    return { songs: data, topicalIndex: indexData, loading: loading, error: error }
}
