import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Alert from '@blazejkustra/react-native-alert';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { router, Stack, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import * as ScreenOrientation from 'expo-screen-orientation';
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import Ionicons from '@react-native-vector-icons/ionicons';
import TrackPlayer from '@rntp/player';
import { usePostHog } from 'posthog-react-native';

import { DisplayMoreMenu } from '@/components/DisplayMoreMenu';
import { DisplayBackToTopButton, BACK_TO_TOP_BUTTON_MARGIN_BOTTOM } from '@/components/display/DisplayBackToTopButton';
import { DisplayHeaderToolbar } from '@/components/display/DisplayHeaderToolbar';
import {
    DisplayMusicSheet,
    type DisplayMusicSheetHandle,
} from '@/components/display/DisplayMusicSheet';
import {
    SheetMusicViewer,
    type SheetMusicViewerHandle,
} from '@/components/display/SheetMusicViewer';
import { SheetMusicSwipeFrame } from '@/components/display/SheetMusicSwipeFrame';
import { showReportIssuePrompt } from '@/components/ReportIssuePrompt';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import {
    getEcampBannerBackToTopBottom,
    getEcampBannerBottomInset,
} from '@/constants/ecampBanner';
import { isIOS26DesignEnabled } from '@/constants/iosDesign';
import { configureTrackPlayerCommands } from '@/constants/trackPlayer';
import { useBookData } from '@/hooks/useBookData';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useDisplaySongNavigation } from '@/hooks/useDisplaySongNavigation';
import { useEcampDisplayState } from '@/hooks/useEcampDisplayState';
import { useI18n } from '@/hooks/useI18n';
import { useSongDocument } from '@/hooks/useSongDocument';
import { useSongListData } from '@/hooks/useSongListData';
import { useReportAPI } from '@/scripts/report';

function isLandscapeOrientation(orientation: ScreenOrientation.Orientation) {
    return orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT
        || orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
}

export default function DisplayScreen() {
    const params = useLocalSearchParams<{ id: string; number: string; openSheet?: string; openPiano?: string }>();
    const theme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const headerHeight = useHeaderHeight();
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    const headerHeightRatio = headerHeight / windowHeight;
    const ios26DesignEnabled = isIOS26DesignEnabled();
    const isLiquidGlass = ios26DesignEnabled
        && isLiquidGlassAvailable()
        && isGlassEffectAPIAvailable();
    const isIos26OrNewer = ios26DesignEnabled;
    const visibleHeaderBarHeight = Platform.OS === 'android' ? 60 : 48;

    const context = useContext(HymnalContext);
    const book = useBookData(params.id, context);
    const { loading: songsLoading, songs } = useSongListData(book);
    const invertedPreference = context?.invertSheetMusic ?? false;

    const {
        source,
        songNotes,
        shouldInvert,
    } = useSongDocument({
        book,
        songs,
        songId: params.number,
        invertSheetMusic: invertedPreference,
        theme,
    });

    const {
        previousSongNumber,
        nextSongNumber,
        goToPrevious,
        goToNext,
        handleHorizontalSwipe,
    } = useDisplaySongNavigation({
        bookId: params.id,
        songNumber: params.number,
        songs,
    });

    const navigation = useNavigation();
    const [isDisplayScreenFocused, setIsDisplayScreenFocused] = useState(true);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const [isZoomedOut, setIsZoomedOut] = useState(true);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [hasPiano, setHasPiano] = useState(false);
    const [isHorizontal, setIsHorizontal] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const musicSheetRef = useRef<DisplayMusicSheetHandle>(null);
    const viewerRef = useRef<SheetMusicViewerHandle>(null);
    const lastHandledOpenSheetTokenRef = useRef<string | null>(null);
    const [pendingOpenSheetToken, setPendingOpenSheetToken] = useState<string | null>(null);

    const i18n = useI18n();
    const insets = useSafeAreaInsets();
    const posthog = usePostHog();
    const reportAPI = useReportAPI();
    const { display: ecampDisplay, hidden: ecampBannerHidden } = useEcampDisplayState();
    const ecampBannerVisible = Boolean(ecampDisplay) && !ecampBannerHidden;
    const isLandscapeLayout = windowWidth > windowHeight;
    const ecampBannerBottomInset = getEcampBannerBottomInset(insets, {
        isTabRoute: false,
        mediaAccessoryVisible: false,
    });
    const backToTopBottom = ecampBannerVisible && !isLandscapeLayout
        ? getEcampBannerBackToTopBottom(ecampBannerBottomInset, BACK_TO_TOP_BUTTON_MARGIN_BOTTOM)
        : BACK_TO_TOP_BUTTON_MARGIN_BOTTOM;

    const styles = useMemo(() => makeStyles(theme), [theme]);
    const contentInsets = useMemo(() => ({
        top: !isIos26OrNewer ? visibleHeaderBarHeight : 0,
        bottom: 40,
    }), [isIos26OrNewer, visibleHeaderBarHeight]);

    const isDisplayFullyLoaded = isDisplayScreenFocused
        && !songsLoading
        && !!book
        && !!songs
        && !!source;

    useLayoutEffect(() => {
        setIsDisplayScreenFocused(navigation.isFocused());
        const onFocus = () => setIsDisplayScreenFocused(true);
        const onBlur = () => setIsDisplayScreenFocused(false);
        const subFocus = navigation.addListener('focus', onFocus);
        const subBlur = navigation.addListener('blur', onBlur);
        return () => {
            subFocus();
            subBlur();
        };
    }, [navigation]);

    const submitReportIssue = useCallback(async (description: string) => {
        if (isSubmittingReport) return;
        setIsSubmittingReport(true);
        try {
            const result = await reportAPI.report(
                { book: params.id, number: params.number ?? '' },
                description,
            );
            Alert.alert(result ? i18n.t('reportIssueSuccess') : i18n.t('reportIssueFailure'));
        } finally {
            setIsSubmittingReport(false);
        }
    }, [i18n, isSubmittingReport, params.id, params.number, reportAPI]);

    const openReportIssuePrompt = useCallback(() => {
        showReportIssuePrompt(i18n, submitReportIssue);
    }, [i18n, submitReportIssue]);

    const handleMusicPress = useCallback(() => {
        musicSheetRef.current?.toggle();
    }, []);

    const broadcastSong = useCallback(() => {
        router.navigate({
            pathname: '/display/[id]/[number]/broadcast',
            params: { id: params.id, number: params.number || '' },
        });
    }, [params.id, params.number]);

    const headerOptions = useMemo(() => {
        const keepsStaticHeaderSlot = !isIos26OrNewer;
        const shouldShowHeaderChrome = isHeaderVisible;
        const options = {
            title: '',
            headerShown: keepsStaticHeaderSlot ? true : isHeaderVisible,
            headerTransparent: keepsStaticHeaderSlot || isIos26OrNewer,
            headerShadowVisible: false,
            headerStyle: keepsStaticHeaderSlot || isIos26OrNewer
                ? { backgroundColor: 'transparent' }
                : { backgroundColor: Colors[theme].background },
        } as const;

        if (isIos26OrNewer) {
            return options;
        }

        return {
            ...options,
            headerLeft: () => shouldShowHeaderChrome ? (
                <TouchableOpacity hitSlop={10} onPress={() => router.back()}>
                    <Ionicons
                        name="chevron-back"
                        size={24}
                        color={Colors[theme].icon}
                    />
                </TouchableOpacity>
            ) : null,
            headerRight: () => shouldShowHeaderChrome ? (
                <View style={styles.legacyHeaderRight}>
                    {songNotes.length > 0 ? (
                        <TouchableOpacity
                            onPress={handleMusicPress}
                            hitSlop={{ top: 14, bottom: 14, left: 18, right: 18 }}
                        >
                            <Ionicons name="musical-notes" size={24} color={Colors[theme].icon} />
                        </TouchableOpacity>
                    ) : null}
                    {context?.broadcastingToken ? (
                        <TouchableOpacity
                            onPress={broadcastSong}
                            hitSlop={{ top: 14, bottom: 14, left: 18, right: 18 }}
                        >
                            <Ionicons name="radio-outline" size={24} color={Colors[theme].icon} />
                        </TouchableOpacity>
                    ) : null}
                    <DisplayMoreMenu
                        bookId={params.id}
                        songId={params.number}
                        onReportIssuePress={openReportIssuePrompt}
                    />
                </View>
            ) : null,
        };
    }, [
        broadcastSong,
        context?.broadcastingToken,
        handleMusicPress,
        isHeaderVisible,
        isIos26OrNewer,
        openReportIssuePrompt,
        params.id,
        params.number,
        songNotes.length,
        styles.legacyHeaderRight,
        theme,
    ]);

    useEffect(() => {
        const openSheetToken = typeof params.openSheet === 'string' ? params.openSheet : undefined;
        const shouldOpenPiano = params.openPiano === '1';
        if (!openSheetToken) return;
        if (shouldOpenPiano && !hasPiano) return;
        if (lastHandledOpenSheetTokenRef.current === openSheetToken) return;
        setPendingOpenSheetToken(openSheetToken);
    }, [hasPiano, params.openPiano, params.openSheet]);

    useEffect(() => {
        if (!pendingOpenSheetToken || !isDisplayFullyLoaded) return;
        if (lastHandledOpenSheetTokenRef.current === pendingOpenSheetToken) return;

        let cancelled = false;
        const openSheetWhenReady = async () => {
            const shouldOpenPiano = params.openPiano === '1' && hasPiano;
            await new Promise<void>((resolve) => {
                requestIdleCallback(() => resolve());
            });
            if (cancelled) return;

            setSelectedIndex(shouldOpenPiano ? 1 : 0);

            for (let i = 0; i < 8; i++) {
                if (cancelled) return;
                if (musicSheetRef.current) {
                    musicSheetRef.current.present();
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 80));
            }

            if (cancelled) return;
            lastHandledOpenSheetTokenRef.current = pendingOpenSheetToken;
            setPendingOpenSheetToken(null);
        };

        void openSheetWhenReady();
        return () => {
            cancelled = true;
        };
    }, [hasPiano, isDisplayFullyLoaded, params.openPiano, pendingOpenSheetToken]);

    useFocusEffect(
        useCallback(() => {
            if (songsLoading) return;

            ScreenOrientation.unlockAsync();
            const updateIsHorizontal = async () => {
                const orientation = await ScreenOrientation.getOrientationAsync();
                setIsHorizontal(isLandscapeOrientation(orientation));
            };

            void updateIsHorizontal();
            const subscription = ScreenOrientation.addOrientationChangeListener(() => {
                void updateIsHorizontal();
            });

            if (!context || !songs || !book || !params.number) {
                return () => {
                    ScreenOrientation.removeOrientationChangeListener(subscription);
                };
            }

            setHasPiano(false);
            setIsZoomedOut(true);
            setShowBackToTop(false);

            posthog.capture('hymn_viewed', {
                hymnal_id: params.id,
                hymnal_name: context.BOOK_DATA[params.id]?.name?.medium,
                song_id: params.number,
                song_name: songs[params.number]?.title,
            });

            (async () => {
                const url = `https://acchymnsmedia.s3.us-east-2.amazonaws.com/${params.id}/${params.number}.mp3`;
                try {
                    const response = await fetch(url, { method: 'HEAD' });
                    if (!response.ok) {
                        setHasPiano(false);
                        return;
                    }
                    setHasPiano(true);

                    const currentTrack = TrackPlayer.getActiveMediaItem();
                    if (currentTrack?.mediaId === `${params.id}:${params.number}`) {
                        configureTrackPlayerCommands();
                        return;
                    }

                    const trackData = {
                        mediaId: `${params.id}:${params.number}`,
                        url,
                        title: songs[params.number].title,
                        artist: book.name.medium,
                        artworkUrl: 'https://raw.githubusercontent.com/ACC-Hymns/acchymns-rn/refs/heads/main/assets/icons/ios-dark.png',
                    };
                    TrackPlayer.preload(trackData);
                    TrackPlayer.setMediaItem(trackData);
                    configureTrackPlayerCommands();
                } catch {
                    console.error('Error fetching piano mp3');
                    setHasPiano(false);
                }
            })();

            return () => {
                ScreenOrientation.removeOrientationChangeListener(subscription);
            };
        }, [book, context, params.id, params.number, posthog, songs, songsLoading]),
    );

    useEffect(() => {
        const unsubscribe = navigation.addListener('removed', (event) => {
            if (event.data.action.type === 'GO_BACK') {
                void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            }

            const nextRoute = event.data.action.payload as {
                name?: string;
            } | null | undefined;

            if (!nextRoute) return;

            if (!nextRoute.name?.startsWith('index')) {
                void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            } else {
                void ScreenOrientation.unlockAsync();
            }
        });

        return () => {
            queueMicrotask(unsubscribe);
        };
    }, [navigation]);

    const shouldShowFauxHeader = !isIos26OrNewer;
    const fauxHeaderOpacity = useSharedValue(
        shouldShowFauxHeader && isHeaderVisible ? 1 : 0,
    );

    useEffect(() => {
        fauxHeaderOpacity.value = withTiming(
            shouldShowFauxHeader && isHeaderVisible ? 1 : 0,
            { duration: 140, easing: Easing.linear },
        );
    }, [fauxHeaderOpacity, isHeaderVisible, shouldShowFauxHeader]);

    const fauxHeaderAnimatedStyle = useAnimatedStyle(() => ({
        opacity: fauxHeaderOpacity.value,
    }));

    const fauxHeaderBackgroundStyle = useMemo(() => {
        if (!shouldShowFauxHeader) return undefined;
        return {
            position: 'absolute' as const,
            top: 0,
            left: 0,
            right: 0,
            height: headerHeight,
            backgroundColor: Colors[theme].background,
            zIndex: 10,
        };
    }, [headerHeight, shouldShowFauxHeader, theme]);

    const handleScrollToTop = useCallback(() => {
        viewerRef.current?.scrollToTop();
    }, []);

    return (
        <View style={styles.container}>
            <Stack.Screen options={headerOptions} />
            {isIos26OrNewer ? (
                <DisplayHeaderToolbar
                    isHeaderVisible={isHeaderVisible}
                    theme={theme}
                    songNotesCount={songNotes.length}
                    hasBroadcasting={!!context?.broadcastingToken}
                    bookId={params.id}
                    songId={params.number ?? ''}
                    onBack={() => router.back()}
                    onMusicPress={handleMusicPress}
                    onBroadcast={broadcastSong}
                    onReportIssuePress={openReportIssuePrompt}
                />
            ) : null}
            {fauxHeaderBackgroundStyle ? (
                <Animated.View
                    pointerEvents="none"
                    style={[fauxHeaderBackgroundStyle, fauxHeaderAnimatedStyle]}
                />
            ) : null}
            {source ? (
                <SheetMusicSwipeFrame
                    theme={theme}
                    isZoomedOut={isZoomedOut}
                    previousSongNumber={previousSongNumber}
                    nextSongNumber={nextSongNumber}
                    onSwipeToPrevious={goToPrevious}
                    onSwipeToNext={goToNext}
                >
                    <SheetMusicViewer
                        ref={viewerRef}
                        source={source}
                        theme={theme}
                        inverted={shouldInvert}
                        headerHeightRatio={headerHeightRatio}
                        contentInsets={contentInsets}
                        style={styles.container}
                        nestedScrollEnabled={Platform.OS === 'android'}
                        onToggleHeader={() => setIsHeaderVisible((visible) => !visible)}
                        onScrollPosition={({ atTop }) => setShowBackToTop(!atTop)}
                        onZoomChange={({ isZoomedOut: zoomedOut }) => {
                            if (Platform.OS === 'ios') {
                                setIsZoomedOut(zoomedOut);
                            }
                        }}
                        onHorizontalSongSwipe={({ direction }) => {
                            if (Platform.OS === 'android') {
                                handleHorizontalSwipe(direction);
                            }
                        }}
                    />
                </SheetMusicSwipeFrame>
            ) : (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" />
                </View>
            )}
            <DisplayMusicSheet
                ref={musicSheetRef}
                theme={theme}
                songNotes={songNotes}
                hasPiano={hasPiano}
                isHorizontal={isHorizontal}
                selectedIndex={selectedIndex}
                onSelectedIndexChange={setSelectedIndex}
            />
            <DisplayBackToTopButton
                visible={!!source && showBackToTop}
                theme={theme}
                bottom={backToTopBottom}
                isLiquidGlass={isLiquidGlass}
                onPress={handleScrollToTop}
            />
        </View>
    );
}

function makeStyles(theme: 'light' | 'dark') {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: Colors[theme].songBackground,
        },
        loading: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        legacyHeaderRight: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 24,
            marginHorizontal: 8,
        },
    });
}
