import React, { forwardRef } from 'react';
import { WebViewSheetMusicViewer } from './WebViewSheetMusicViewer';
import type {
    SheetMusicViewerHandle,
    SheetMusicViewerProps,
} from './sheet-music-viewer-types';

export type {
    SheetMusicContentInsets,
    SheetMusicSwipeDirection,
    SheetMusicViewerHandle,
    SheetMusicViewerProps,
} from './sheet-music-viewer-types';

export const SheetMusicViewer = forwardRef<SheetMusicViewerHandle, SheetMusicViewerProps>(
    function SheetMusicViewer(props, ref) {
        return <WebViewSheetMusicViewer ref={ref} {...props} />;
    },
);
