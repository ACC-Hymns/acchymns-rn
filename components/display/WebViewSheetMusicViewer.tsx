import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import WebViewImpl, { type WebViewProps } from 'react-native-webview';

type SheetWebViewHandle = {
    injectJavaScript: (script: string) => void;
};

// react-native-webview 14 defaults its props generic to `undefined`, which
// collapses `WebViewProps & undefined` to `never` under TypeScript 6.
const WebView = WebViewImpl as unknown as React.ComponentType<
    WebViewProps & React.RefAttributes<SheetWebViewHandle>
>;
import { buildSheetMusicHtml } from '@/scripts/song-document';
import type {
    SheetMusicViewerHandle,
    SheetMusicViewerProps,
} from './sheet-music-viewer-types';

const ZOOM_DETECTION_JS = `
(function() {
    let tapStartX = 0;
    let tapStartY = 0;
    let tapStartTime = 0;
    const MAX_TAP_DISTANCE = 10;
    const MAX_TAP_DURATION = 300;

    const postScrollState = () => {
        const atTop = (window.scrollY || document.documentElement.scrollTop || 0) <= 4;
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'scrollPosition',
            atTop: atTop
        }));
    };

    window.addEventListener('scroll', postScrollState, { passive: true });
    postScrollState();

    document.addEventListener('touchstart', (event) => {
        const touch = event.changedTouches && event.changedTouches[0];
        if (!touch) return;
        tapStartX = touch.clientX;
        tapStartY = touch.clientY;
        tapStartTime = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', (event) => {
        const touch = event.changedTouches && event.changedTouches[0];
        if (!touch || !tapStartTime) return;
        const deltaX = Math.abs(touch.clientX - tapStartX);
        const deltaY = Math.abs(touch.clientY - tapStartY);
        const duration = Date.now() - tapStartTime;
        if (deltaX <= MAX_TAP_DISTANCE && deltaY <= MAX_TAP_DISTANCE && duration <= MAX_TAP_DURATION) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'toggleHeader' }));
        }
        tapStartTime = 0;
    }, { passive: true });

    const handleScroll = () => {
        const isZoomedOut = window.visualViewport.scale <= 1.01;
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'zoomChange',
            isZoomedOut: isZoomedOut
        }));
    };
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleScroll);
        handleScroll();
    }
})();
true;
`;

const SCROLL_TO_TOP_JS = `
window.scrollTo({ top: 0, behavior: 'smooth' });
true;
`;

function buildContentInsetsJS(top: number, bottom: number): string {
    return `
(function() {
    const id = '__acchymns_header_compensation';
    let styleTag = document.getElementById(id);
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = id;
        document.head.appendChild(styleTag);
    }
    styleTag.textContent = 'html, body { padding-top: ${top}px !important; padding-bottom: ${bottom}px !important; box-sizing: border-box; }';
})();
true;
`;
}

export const WebViewSheetMusicViewer = forwardRef<SheetMusicViewerHandle, SheetMusicViewerProps>(
    function WebViewSheetMusicViewer(
        {
            source,
            theme,
            inverted,
            headerHeightRatio,
            contentInsets,
            style,
            nestedScrollEnabled,
            onToggleHeader,
            onScrollPosition,
            onZoomChange,
            onHorizontalSongSwipe,
        },
        ref,
    ) {
        const webViewRef = useRef<SheetWebViewHandle>(null);
        const [html, setHtml] = useState<string | undefined>();

        useEffect(() => {
            let cancelled = false;
            (async () => {
                try {
                    const nextHtml = await buildSheetMusicHtml(source, {
                        inverted,
                        theme,
                        headerHeightRatio,
                    });
                    if (!cancelled) {
                        setHtml(nextHtml);
                    }
                } catch (e) {
                    console.error('Failed to build sheet music HTML', e);
                    if (!cancelled) {
                        setHtml(undefined);
                    }
                }
            })();
            return () => {
                cancelled = true;
            };
        }, [source.fileUri, source.kind, source.mimeType, source.songId, inverted, theme, headerHeightRatio]);

        const applyContentInsets = useCallback(() => {
            webViewRef.current?.injectJavaScript(
                buildContentInsetsJS(contentInsets.top, contentInsets.bottom),
            );
        }, [contentInsets.bottom, contentInsets.top]);

        useImperativeHandle(ref, () => ({
            scrollToTop: () => {
                webViewRef.current?.injectJavaScript(SCROLL_TO_TOP_JS);
            },
            setContentInsets: (insets) => {
                webViewRef.current?.injectJavaScript(
                    buildContentInsetsJS(insets.top, insets.bottom),
                );
            },
        }), []);

        useEffect(() => {
            applyContentInsets();
        }, [applyContentInsets]);

        const webViewSource = useMemo(() => {
            if (!html) return undefined;
            return { html };
        }, [html]);

        const onMessage = useCallback((event: { nativeEvent: { data: string } }) => {
            try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'toggleHeader') {
                    onToggleHeader();
                    return;
                }
                if (data.type === 'scrollPosition') {
                    onScrollPosition({ atTop: !!data.atTop });
                    return;
                }
                if (data.type === 'horizontalSongSwipe') {
                    onHorizontalSongSwipe({
                        direction: data.direction === 'right' ? 'right' : 'left',
                    });
                    return;
                }
                if (data.type === 'zoomChange') {
                    onZoomChange({ isZoomedOut: !!data.isZoomedOut });
                }
            } catch (e) {
                console.error('Failed to parse WebView message', e);
            }
        }, [onHorizontalSongSwipe, onScrollPosition, onToggleHeader, onZoomChange]);

        if (!webViewSource) {
            return (
                <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" />
                </View>
            );
        }

        return (
            <WebView
                ref={webViewRef}
                style={style}
                originWhitelist={['*']}
                source={webViewSource}
                setBuiltInZoomControls={true}
                injectedJavaScript={ZOOM_DETECTION_JS}
                nestedScrollEnabled={nestedScrollEnabled ?? Platform.OS === 'android'}
                onMessage={onMessage}
                onLoadEnd={applyContentInsets}
            />
        );
    },
);
