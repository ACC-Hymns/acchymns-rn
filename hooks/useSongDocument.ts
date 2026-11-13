import { useCallback, useEffect, useState } from 'react';
import { BookSummary, SongList } from '@/constants/types';
import { resolveSongDocument, SongDocumentSource } from '@/scripts/song-document';

type UseSongDocumentArgs = {
    book?: BookSummary;
    songs?: SongList;
    songId?: string;
    invertSheetMusic: boolean;
    theme: 'light' | 'dark';
};

export function useSongDocument({
    book,
    songs,
    songId,
    invertSheetMusic,
    theme,
}: UseSongDocumentArgs) {
    const [source, setSource] = useState<SongDocumentSource | undefined>();
    const [songNotes, setSongNotes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const shouldInvert = invertSheetMusic && theme === 'dark';

    const reload = useCallback(async () => {
        if (!book || !songs || !songId || !songs[songId]) {
            return;
        }

        setLoading(true);
        try {
            const nextSource = await resolveSongDocument(book, songId);
            setSource(nextSource);

            const notes = songs[songId].notes;
            setSongNotes(notes ? [...notes].reverse() : []);
        } catch (e) {
            console.error(e);
            setSource(undefined);
            setSongNotes([]);
        } finally {
            setLoading(false);
        }
    }, [book, songId, songs]);

    useEffect(() => {
        void reload();
    }, [reload]);

    return {
        source,
        songNotes,
        loading,
        shouldInvert,
        reload,
    };
}
