import type { StyleProp, ViewStyle } from 'react-native';
import type { SongDocumentSource } from '@/scripts/song-document';

export type SheetMusicSwipeDirection = 'left' | 'right';

export type SheetMusicContentInsets = {
    top: number;
    bottom: number;
};

export type SheetMusicViewerHandle = {
    scrollToTop: () => void;
    setContentInsets: (insets: SheetMusicContentInsets) => void;
};

export type SheetMusicViewerProps = {
    source: SongDocumentSource;
    theme: 'light' | 'dark';
    inverted: boolean;
    headerHeightRatio: number;
    contentInsets: SheetMusicContentInsets;
    style?: StyleProp<ViewStyle>;
    nestedScrollEnabled?: boolean;
    onToggleHeader: () => void;
    onScrollPosition: (payload: { atTop: boolean }) => void;
    onZoomChange: (payload: { isZoomedOut: boolean }) => void;
    onHorizontalSongSwipe: (payload: { direction: SheetMusicSwipeDirection }) => void;
};
