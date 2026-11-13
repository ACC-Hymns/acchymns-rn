import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import { PdfView, type PdfViewRef } from '@kishannareshpal/expo-pdf';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { Colors } from '@/constants/Colors';
import { isIOS26DesignEnabled } from '@/constants/iosDesign';
import type {
    SheetMusicContentInsets,
    SheetMusicViewerHandle,
    SheetMusicViewerProps,
} from './sheet-music-viewer-types';

const ANDROID_SWIPE_MIN_DX = 64;

export const ExpoPdfSheetMusicViewer = forwardRef<SheetMusicViewerHandle, SheetMusicViewerProps>(
    function ExpoPdfSheetMusicViewer(
        {
            source,
            theme,
            inverted,
            headerHeightRatio,
            contentInsets,
            style,
            onToggleHeader,
            onScrollPosition,
            onZoomChange,
            onHorizontalSongSwipe,
        },
        ref,
    ) {
        const { height: windowHeight } = useWindowDimensions();
        const [insets, setInsets] = useState<SheetMusicContentInsets>(contentInsets);
        const [isLoaded, setIsLoaded] = useState(false);
        const pdfRef = useRef<PdfViewRef>(null);

        const onScrollPositionRef = useRef(onScrollPosition);
        const onZoomChangeRef = useRef(onZoomChange);
        const onToggleHeaderRef = useRef(onToggleHeader);
        const onHorizontalSongSwipeRef = useRef(onHorizontalSongSwipe);
        onScrollPositionRef.current = onScrollPosition;
        onZoomChangeRef.current = onZoomChange;
        onToggleHeaderRef.current = onToggleHeader;
        onHorizontalSongSwipeRef.current = onHorizontalSongSwipe;

        useEffect(() => {
            setInsets(contentInsets);
        }, [contentInsets.bottom, contentInsets.top]);

        useEffect(() => {
            setIsLoaded(false);
            onScrollPositionRef.current({ atTop: true });
            onZoomChangeRef.current({ isZoomedOut: true });
        }, [source.fileUri, source.songId]);

        useImperativeHandle(ref, () => ({
            scrollToTop: () => {
                void pdfRef.current?.scrollToTop(true);
                onScrollPositionRef.current({ atTop: true });
            },
            setContentInsets: (next) => {
                setInsets(next);
            },
        }), []);

        const contentPadding = useMemo(() => {
            const liquidGlassTop = isIOS26DesignEnabled()
                ? Math.ceil(headerHeightRatio * windowHeight * 1.1)
                : 0;
            return {
                top: insets.top + liquidGlassTop,
                bottom: insets.bottom,
                left: 0,
                right: 0,
            };
        }, [headerHeightRatio, insets.bottom, insets.top, windowHeight]);

        const handleLoadComplete = useCallback(() => {
            setIsLoaded(true);
            onScrollPositionRef.current({ atTop: true });
            // expo-pdf does not expose zoom scale; default-fit is treated as zoomed out
            // so iOS song-swipe gestures remain available.
            onZoomChangeRef.current({ isZoomedOut: true });
            // Native reload already pins to top; call again after padding settles.
            requestAnimationFrame(() => {
                void pdfRef.current?.scrollToTop(false);
            });
        }, []);

        const handleScroll = useCallback((event: { atTop: boolean }) => {
            onScrollPositionRef.current({ atTop: event.atTop });
        }, []);

        const handleError = useCallback((event: { code: string; message: string }) => {
            console.error('Failed to load sheet music PDF', event.code, event.message);
            setIsLoaded(false);
        }, []);

        const toggleHeader = useCallback(() => {
            onToggleHeaderRef.current();
        }, []);

        const emitHorizontalSwipe = useCallback((direction: 'left' | 'right') => {
            onHorizontalSongSwipeRef.current({ direction });
        }, []);

        const tapGesture = useMemo(() => {
            return Gesture.Tap()
                .maxDuration(300)
                .maxDistance(10)
                .onEnd(() => {
                    'worklet';
                    scheduleOnRN(toggleHeader);
                });
        }, [toggleHeader]);

        const androidSwipeGesture = useMemo(() => {
            if (Platform.OS !== 'android') {
                return undefined;
            }

            return Gesture.Pan()
                .activeOffsetX([-24, 24])
                .failOffsetY([-28, 28])
                .onEnd((event) => {
                    'worklet';
                    const { translationX, translationY } = event;
                    if (Math.abs(translationX) < ANDROID_SWIPE_MIN_DX) return;
                    if (Math.abs(translationX) < Math.abs(translationY) * 1.2) return;
                    scheduleOnRN(
                        emitHorizontalSwipe,
                        translationX > 0 ? 'right' : 'left',
                    );
                });
        }, [emitHorizontalSwipe]);

        const composedGesture = useMemo(() => {
            if (androidSwipeGesture) {
                return Gesture.Simultaneous(tapGesture, androidSwipeGesture);
            }
            return tapGesture;
        }, [androidSwipeGesture, tapGesture]);

        return (
            <GestureDetector gesture={composedGesture}>
                <View style={[styles.container, style, { backgroundColor: Colors[theme].songBackground }]}>
                    {!isLoaded ? (
                        <View style={styles.loading} pointerEvents="none">
                            <ActivityIndicator size="large" />
                        </View>
                    ) : null}
                    <PdfView
                        ref={pdfRef}
                        style={[
                            styles.pdf,
                            { backgroundColor: Colors[theme].songBackground },
                        ]}
                        uri={source.fileUri}
                        fitMode="width"
                        autoScale
                        doubleTapToZoom
                        pageColorInverted={inverted}
                        contentPadding={contentPadding}
                        onLoadComplete={handleLoadComplete}
                        onScroll={handleScroll}
                        onError={handleError}
                    />
                </View>
            </GestureDetector>
        );
    },
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    pdf: {
        flex: 1,
    },
    loading: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
});
