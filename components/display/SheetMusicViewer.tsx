import React, { forwardRef } from 'react';
import { Platform } from 'react-native';
import { WebViewSheetMusicViewer } from './WebViewSheetMusicViewer';
import type {
    SheetMusicViewerHandle,
    SheetMusicViewerProps,
} from './sheet-music-viewer-types';
import type { ExpoPdfSheetMusicViewer as ExpoPdfSheetMusicViewerComponent } from './ExpoPdfSheetMusicViewer';

export type {
    SheetMusicContentInsets,
    SheetMusicSwipeDirection,
    SheetMusicViewerHandle,
    SheetMusicViewerProps,
} from './sheet-music-viewer-types';

/**
 * Sheet music / hymn document viewer.
 * PDFs use native `@kishannareshpal/expo-pdf`; images keep the WebView renderer.
 */
export const SheetMusicViewer = forwardRef<SheetMusicViewerHandle, SheetMusicViewerProps>(
    function SheetMusicViewer(props, ref) {
        if (props.source.kind === 'pdf' && Platform.OS !== 'web') {
            const { ExpoPdfSheetMusicViewer } = require('./ExpoPdfSheetMusicViewer') as {
                ExpoPdfSheetMusicViewer: typeof ExpoPdfSheetMusicViewerComponent;
            };
            return <ExpoPdfSheetMusicViewer ref={ref} {...props} />;
        }
        return <WebViewSheetMusicViewer ref={ref} {...props} />;
    },
);
