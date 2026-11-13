import { useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SongList } from '@/constants/types';
import type { SheetMusicSwipeDirection } from '@/components/display/sheet-music-viewer-types';

type UseDisplaySongNavigationArgs = {
    bookId: string;
    songNumber?: string;
    songs?: SongList;
};

export function useDisplaySongNavigation({
    bookId,
    songNumber,
    songs,
}: UseDisplaySongNavigationArgs) {
    const songNumbers = useMemo(
        () => Object.keys(songs || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        [songs],
    );

    const currentIndex = useMemo(
        () => (songNumber ? songNumbers.indexOf(songNumber) : -1),
        [songNumber, songNumbers],
    );

    const previousSongNumber = currentIndex > 0 ? songNumbers[currentIndex - 1] : undefined;
    const nextSongNumber =
        currentIndex >= 0 && currentIndex < songNumbers.length - 1
            ? songNumbers[currentIndex + 1]
            : undefined;

    const goToSong = useCallback((number: string) => {
        router.replace({
            pathname: '/display/[id]/[number]',
            params: { id: bookId, number },
        });
    }, [bookId]);

    const goToPrevious = useCallback(() => {
        if (!previousSongNumber) return;
        goToSong(previousSongNumber);
    }, [goToSong, previousSongNumber]);

    const goToNext = useCallback(() => {
        if (!nextSongNumber) return;
        goToSong(nextSongNumber);
    }, [goToSong, nextSongNumber]);

    const handleHorizontalSwipe = useCallback((direction: SheetMusicSwipeDirection) => {
        if (direction === 'right' && previousSongNumber) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            goToSong(previousSongNumber);
            return;
        }
        if (direction === 'left' && nextSongNumber) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            goToSong(nextSongNumber);
        }
    }, [goToSong, nextSongNumber, previousSongNumber]);

    return {
        songNumbers,
        currentIndex,
        previousSongNumber,
        nextSongNumber,
        goToPrevious,
        goToNext,
        handleHorizontalSwipe,
    };
}
