import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, Image, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Button, Linking, ScrollView, Platform, useWindowDimensions, InteractionManager } from 'react-native';
import Alert from '@blazejkustra/react-native-alert';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { router, Stack, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Bookmark, BookSummary, Song, SongList } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import {
    BottomSheetModal,
    BottomSheetView,
    BottomSheetModalProvider,
} from '@expo/ui/community/bottom-sheet';
import SegmentedControl from '@expo/ui/community/segmented-control';
import { DisplayMoreMenu } from '@/components/DisplayMoreMenu';
import { showReportIssuePrompt } from '@/components/ReportIssuePrompt';
import NoteButton from '@/components/NoteButton';
import { getNoteMp3, Note, notePngs } from '@/constants/assets';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getHTMLStringFromSong } from '@/scripts/image_handler';
import Slider from '@react-native-community/slider';
import { compareTitles, searchHymnary, SearchResult } from '@/scripts/hymnary_api';
import { useReportAPI } from '@/scripts/report';
import Ionicons from '@react-native-vector-icons/ionicons'
import { error } from 'pdf-lib';
import { usePostHog } from 'posthog-react-native';
import { useI18n } from '@/hooks/useI18n';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Canvas, useImage, Image as SkiaImage, Paint, Skia, ColorMatrix } from '@shopify/react-native-skia';
import StyledText from '@/components/StyledText';
import TrackPlayer, { PlaybackState, useIsPlaying, usePlaybackState, useProgress } from '@rntp/player';
import { useBookData } from '@/hooks/useBookData';
import { useSongData } from '@/hooks/useSongData';
import { useSongListData } from '@/hooks/useSongListData';
import WebView from 'react-native-webview';
import { useHeaderHeight } from 'expo-router/react-navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleOnRN } from 'react-native-worklets';
import { ScreenHeight } from 'react-native-elements/dist/helpers';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as SwiftUI from '@expo/ui/swift-ui';
import { presentationDetents } from '@expo/ui/swift-ui/modifiers';
import { isIOS26DesignEnabled } from '@/constants/iosDesign';

export default function DisplayScreen() {
    const params = useLocalSearchParams<{ id: string, number: string, openSheet?: string, openPiano?: string }>();
    const theme = useColorScheme() ?? 'light';
    const headerHeight = useHeaderHeight();
    const { height: windowHeight } = useWindowDimensions();
    const headerHeightRatio = headerHeight / windowHeight;
    const ios26DesignEnabled = isIOS26DesignEnabled();
    const isLiquidGlass = ios26DesignEnabled
        && isLiquidGlassAvailable()
        && isGlassEffectAPIAvailable();
    const isIos26OrNewer = ios26DesignEnabled;
    const visibleHeaderBarHeight = Platform.OS === 'android' ? 60 : 48;
    const useSwiftUIBottomSheet = ios26DesignEnabled;
    const SwiftUIBottomSheet = SwiftUI.BottomSheet;
    const SwiftUIHost = SwiftUI.Host;
    const SwiftUIRNHostView = SwiftUI.RNHostView ?? (({ children }: { children: React.ReactElement }) => children);

    const context = useContext(HymnalContext);
    const BOOKMARKS_KEY = 'bookmarks';
    const [existingBookmarks, setExistingBookmarks] = useState<Bookmark[]>([]);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const addBookmark = async (bookmark: Bookmark) => {
        try {
            const bookmarks: Bookmark[] = existingBookmarks ?? [];
            // Check if the bookmark already exists
            const exists = bookmarks.some(b => b.book === bookmark.book && b.number === bookmark.number);
            if (exists) {
                removeBookmark(bookmark);
                return;
            }
            bookmarks.push(bookmark);
            await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
            setExistingBookmarks(bookmarks); // Update the current bookmarks
            setIsBookmarked(true); // Set the bookmark state to true
        } catch (error) {
            console.error("Error saving bookmarks:", error);
        }
    };

    const removeBookmark = async (bookmark: Bookmark) => {
        try {
            const bookmarks: Bookmark[] = existingBookmarks ?? [];
            // Filter out the bookmark to be removed
            const updatedBookmarks = bookmarks.filter(b => !(b.book === bookmark.book && b.number === bookmark.number));
            await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updatedBookmarks));
            setExistingBookmarks(updatedBookmarks); // Update the current bookmarks
            setIsBookmarked(false); // Set the bookmark state to false
        } catch (error) {
            console.error("Error removing bookmark:", error);
        }
    };

    const [songData, setSongData] = useState<Song | null>(null);
    useLayoutEffect(() => {
        if (params.number) {
            getSongData(params.id).then((data) => {
                setSongData(data?.[params.number] || null);
            });

            AsyncStorage.getItem(BOOKMARKS_KEY).then((data) => {
                setExistingBookmarks(JSON.parse(data || '[]'));
            });
        }
    }, [params.id, params.number]);
    useEffect(() => {
        if (songData && existingBookmarks) {
            const isBookmarked = existingBookmarks.some(b => b.book === params.id && b.number === params.number);
            setIsBookmarked(isBookmarked);
        }
    }, [songData, existingBookmarks, params.id, params.number]);

    const book = useBookData(params.id, context);
    const { loading, songs, error } = useSongListData(book);

    const [songNotes, setSongNotes] = useState<string[]>([""]);
    const [imageData, setImageData] = useState<string>();
    const [imageLoading, setLoading] = useState(false);
    const audioPlayers = useRef<AudioPlayer[]>([]);
    const navigation = useNavigation();
    const [isDisplayScreenFocused, setIsDisplayScreenFocused] = useState(true);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);

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


    const inverted = context?.invertSheetMusic ?? false;
    const styles = makeStyles(theme as any, useSwiftUIBottomSheet, inverted);
    const scrollRef = useRef<ScrollView | null>(null);
    const webViewRef = useRef<WebView>(null);
    const [isSwiping, setIsSwiping] = useState(false);

    const i18n = useI18n();
    const reportAPI = useReportAPI();
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const submitReportIssue = useCallback(async (description: string) => {
        if (isSubmittingReport) {
            return;
        }
        setIsSubmittingReport(true);
        try {
            const result = await reportAPI.report(
                { book: params.id, number: params.number ?? '' },
                description
            );
            if (result) {
                Alert.alert(i18n.t('reportIssueSuccess'));
            } else {
                Alert.alert(i18n.t('reportIssueFailure'));
            }
        } finally {
            setIsSubmittingReport(false);
        }
    }, [i18n, isSubmittingReport, params.id, params.number, reportAPI]);

    const openReportIssuePrompt = useCallback(() => {
        showReportIssuePrompt(i18n, submitReportIssue);
    }, [i18n, submitReportIssue]);

    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const isModalOpenRef = useRef(false);
    const [musicSheetOpen, setMusicSheetOpen] = useState(false);
    const lastHandledOpenSheetTokenRef = useRef<string | null>(null);
    const [pendingOpenSheetToken, setPendingOpenSheetToken] = useState<string | null>(null);
    const isDisplayFullyLoaded = isDisplayScreenFocused
        && !loading
        && !!book
        && !!songs
        && !!imageData;


    useEffect(() => {
        if (!isDisplayScreenFocused) {
            return;
        }
        if (musicSheetOpen) {
            void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        } else {
            void ScreenOrientation.unlockAsync();
        }
    }, [isDisplayScreenFocused, musicSheetOpen]);

    const lockToPortraitBeforeSheetOpen = useCallback(async () => {
        const isPortraitOrientation = (orientation: ScreenOrientation.Orientation) => {
            return orientation === ScreenOrientation.Orientation.PORTRAIT_UP
                || orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN;
        };

        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

        const currentOrientation = await ScreenOrientation.getOrientationAsync();
        if (isPortraitOrientation(currentOrientation)) {
            return;
        }

        await new Promise<void>((resolve) => {
            let resolved = false;
            const finish = () => {
                if (resolved) return;
                resolved = true;
                ScreenOrientation.removeOrientationChangeListener(subscription);
                clearTimeout(timeoutId);
                resolve();
            };

            const subscription = ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) => {
                if (isPortraitOrientation(orientationInfo.orientation)) {
                    finish();
                }
            });

            // Avoid hanging the open action if orientation event is delayed.
            const timeoutId = setTimeout(finish, 450);
        });
    }, []);

    const handlePress = useCallback(async () => {
        if (!bottomSheetModalRef.current) return;

        if (isModalOpenRef.current) {
            bottomSheetModalRef.current.dismiss();
        } else {
            await lockToPortraitBeforeSheetOpen();
            bottomSheetModalRef.current.present();
        }
    }, [lockToPortraitBeforeSheetOpen, useSwiftUIBottomSheet]);

    const handleSheetChanges = useCallback((index: number) => {
        isModalOpenRef.current = index === 0;
        setMusicSheetOpen(index >= 0);
    }, []);

    async function broadcastSong() {
        await lockToPortraitBeforeSheetOpen();
        router.navigate({ pathname: '/display/[id]/[number]/broadcast', params: { id: params.id, number: params.number || "" } });
    }

    const headerOptions = useMemo(() => {
        const keepsStaticHeaderSlot = !isIos26OrNewer;
        const shouldShowHeaderChrome = isHeaderVisible;
        return {
            title: "",
            // On iOS <26 and Android, keep header mounted to avoid content jump.
            headerShown: keepsStaticHeaderSlot ? true : isHeaderVisible,
            headerTransparent: keepsStaticHeaderSlot || isIos26OrNewer,
            headerShadowVisible: false,
            headerLeft: () => shouldShowHeaderChrome ? (
                <TouchableOpacity hitSlop={10} onPress={() => router.back()}>
                    <Ionicons
                        name="chevron-back"
                        size={24}
                        color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                    />
                </TouchableOpacity>
            ) : null,
            headerRight: () => shouldShowHeaderChrome ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 24, marginHorizontal: 8 }}>
                    {songNotes.length > 0 ? (
                        <TouchableOpacity
                            onPress={handlePress}
                            hitSlop={{ top: 14, bottom: 14, left: 18, right: 18 }}
                        >
                            <Ionicons
                                name="musical-notes"
                                size={24}
                                color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                            />
                        </TouchableOpacity>
                    ) : (<></>)}
                    {context?.broadcastingToken ? (
                        <TouchableOpacity
                            onPress={broadcastSong}
                            hitSlop={{ top: 14, bottom: 14, left: 18, right: 18 }}
                        >
                            <Ionicons
                                name='radio-outline'
                                size={24}
                                color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                            />
                        </TouchableOpacity>
                    ) : (<></>)}
                    <DisplayMoreMenu
                        bookId={params.id}
                        songId={params.number}
                        onReportIssuePress={openReportIssuePrompt}
                    />
                </View>
            ) : null,
            headerStyle: keepsStaticHeaderSlot || isIos26OrNewer
                ? { backgroundColor: 'transparent' }
                : { backgroundColor: Colors[theme].background },
        };
    }, [
        isHeaderVisible,
        isIos26OrNewer,
        openReportIssuePrompt,
        songNotes.length,
        context?.broadcastingToken,
        params.id,
        params.number,
        handlePress,
        theme,
    ]);

    // piano
    const progress = useProgress();
    const isPianoPlaying = useIsPlaying();
    const [hasPiano, setHasPiano] = useState(false);

    useEffect(() => {
        const openSheetToken = typeof params.openSheet === 'string' ? params.openSheet : undefined;
        const shouldOpenPiano = params.openPiano === '1';
        if (!openSheetToken) {
            return;
        }
        if (shouldOpenPiano && !hasPiano) {
            return;
        }
        if (lastHandledOpenSheetTokenRef.current === openSheetToken) {
            return;
        }
        setPendingOpenSheetToken(openSheetToken);
    }, [hasPiano, params.openPiano, params.openSheet]);

    useEffect(() => {
        if (!pendingOpenSheetToken) {
            return;
        }
        if (!isDisplayFullyLoaded) {
            return;
        }
        if (lastHandledOpenSheetTokenRef.current === pendingOpenSheetToken) {
            return;
        }

        let cancelled = false;
        const openSheetWhenReady = async () => {
            const shouldOpenPiano = params.openPiano === '1' && hasPiano;
            await lockToPortraitBeforeSheetOpen();
            await new Promise<void>((resolve) => {
                InteractionManager.runAfterInteractions(() => resolve());
            });

            if (cancelled) return;
            setSelectedIndex(shouldOpenPiano ? 1 : 0);

            // BottomSheet ref can lag right after navigation; retry briefly.
            for (let i = 0; i < 8; i++) {
                if (cancelled) return;
                if (bottomSheetModalRef.current) {
                    bottomSheetModalRef.current.present();
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
    }, [
        isDisplayFullyLoaded,
        lockToPortraitBeforeSheetOpen,
        hasPiano,
        params.id,
        params.number,
        params.openPiano,
        pendingOpenSheetToken,
        useSwiftUIBottomSheet,
    ]);

    useFocusEffect(
        useCallback(() => {

            if (loading)
                return;


            // Unlock orientation on page load
            ScreenOrientation.unlockAsync();
            const handleOrientationChange = async () => {
                setIsHorizontal(await ScreenOrientation.getOrientationAsync() === ScreenOrientation.Orientation.LANDSCAPE_LEFT || await ScreenOrientation.getOrientationAsync() === ScreenOrientation.Orientation.LANDSCAPE_RIGHT);
            }

            const subscription = ScreenOrientation.addOrientationChangeListener(handleOrientationChange);

            // prefetch

            navigation.addListener('beforeRemove', async (e) => {
                if (e.data.action.type == 'GO_BACK') {
                    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                }

                const nextRoute = (e.data?.action?.payload as { name?: string, params: { [key: string]: string }, singular: any });

                if (!nextRoute)
                    return;

                if (!nextRoute.name?.startsWith('index')) {
                    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                } else {
                    ScreenOrientation.unlockAsync();
                }
                ScreenOrientation.removeOrientationChangeListener(subscription);
            });

            if (!context || !songs || !book) return;

            posthog.capture('hymn_viewed', {
                hymnal_id: params.id,
                hymnal_name: context.BOOK_DATA[params.id]?.name?.medium,
                song_id: params.number,
                song_name: songs[params.number].title,
            });


            (async () => {

                // if invertSheetMusic is true AND theme is dark, invert the image
                const shouldInvert = inverted && theme === 'dark';

                const imageData = await getHTMLStringFromSong(book, params.number, shouldInvert, theme as any, headerHeightRatio);
                if (!imageData) return;
                setImageData(imageData);

                // try and load piano sound
                const URL = `https://acchymnsmedia.s3.us-east-2.amazonaws.com/${params.id}/${params.number}.mp3`;
                // Check if the mp3 exists before creating the player
                try {
                    const response = await fetch(URL, { method: 'HEAD' });
                    if (response.ok) {
                        setHasPiano(true);

                        // if the same track is already playing, don't set it again
                        const currentTrack = TrackPlayer.getActiveMediaItem();
                        if (currentTrack?.mediaId === `${params.id}:${params.number}`) {
                            return;
                        }

                        const track_data = {
                            mediaId: `${params.id}:${params.number}`,
                            url: URL, // Load media from the network
                            title: songs[params.number].title,
                            artist: book.name.medium,
                            artworkUrl: 'https://raw.githubusercontent.com/ACC-Hymns/acchymns-rn/refs/heads/main/assets/icons/ios-dark.png', // Load artwork from the network
                        };
                        TrackPlayer.setMediaItem(track_data);
                    } else {

                    }
                } catch (e) {
                    console.error(`Error fetching piano mp3`);
                }
            })();

        }, [params.id, params.number, context, loading])
    )

    const posthog = usePostHog()
    useEffect(() => {

        const fetchData = async () => {
            try {
                if (!songs || !book)
                    return;

                setLoading(true);
                const inverted = context?.invertSheetMusic ?? false;
                const shouldInvert = inverted && theme === 'dark';

                const imageData = await getHTMLStringFromSong(book, params.number, shouldInvert, theme as any, headerHeightRatio);
                if (!imageData) return;
                setImageData(imageData);

                // set song notes
                const songNotes = songs[params.number].notes;
                // reverse notes - use spread instead of slice().reverse() for better performance
                const reversedNotes = songNotes ? [...songNotes].reverse() : [];
                setSongNotes(reversedNotes);

                // Create audio players asynchronously to avoid blocking
                for (const note of reversedNotes) {
                    const assetId = getNoteMp3(note);
                    const player = createAudioPlayer(assetId);
                    audioPlayers.current.push(player);
                    // Yield to JS thread periodically
                    if (audioPlayers.current.length % 5 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        return () => {
            // Clean up audio players
            audioPlayers.current.forEach(player => {
                player.release();
            });

        };
    }, [context?.invertSheetMusic, songs, theme]);

    const [isHorizontal, setIsHorizontal] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);

    function getClef(note: string) {
        const modified_note = note.replace("#", "").replace("b", "");
        if (songNotes.indexOf(note) > 1 || !Object.keys(notePngs).includes(modified_note)) {
            return 'treble'
        }
        return 'bass';
    }

    // Play all notes in sequence with accurate timing using async/await and setTimeout wrapped in a Promise
    const DELAY = 200;

    async function playAllNotes() {
        for (let index = 0; index < songNotes.length; index++) {
            playNote(songNotes[index]);
            // Wait for DELAY ms before playing the next note
            await new Promise(resolve => setTimeout(resolve, DELAY));
        }
    }

    function playNote(note: string) {
        const id = songNotes.indexOf(note);
        if (id < 0) return;
        const player = audioPlayers.current[id];
        if (player) {
            try {
                if (!player.isLoaded)
                    return;
                player.seekTo(0);
                player.play();
            } catch (error) {
                // try to release and reset the players
                player.release();
                audioPlayers.current[id] = createAudioPlayer(getNoteMp3(note));
                audioPlayers.current[id].play();
            }
        }
    }

    // Notes tab
    const NotesTab = () => {
        return (
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginVertical: 16,
                    minHeight: 110, // Ensures consistent height
                }}
            >
                {songs && (
                    <>
                        <View style={styles.noteButton}>
                            <NoteButton note={"" as Note} clef={'none'} onClick={() => playAllNotes()} />
                            <StyledText style={{ fontSize: 18, color: Colors[theme].text }}>{i18n.t('all')}</StyledText>
                        </View>
                        {songNotes.map((note, index) => (
                            <View key={index} style={styles.noteButton}>
                                <NoteButton note={note as Note} clef={getClef(note)} onClick={() => playNote(note)} />
                                <StyledText style={{ fontSize: 18, color: Colors[theme].text }}>{note}</StyledText>
                            </View>
                        ))}
                    </>
                )}
            </View>
        )
    };

    function formatTime(currentTime: number) {
        const minutes = Math.floor(currentTime / 60);
        const seconds = Math.floor(currentTime % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    // Piano tab
    const PianoTab = () => {

        return (
            <View
                style={{
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginVertical: 16,
                    minHeight: 110, // Ensures consistent height
                }}
            >
                <TouchableOpacity
                    style={{
                        marginTop: 8
                    }}
                    onPress={async () => {
                        const isPlaying = await TrackPlayer.isPlaying();
                        if (isPlaying)
                            TrackPlayer.pause();
                        else {
                            // if the track is at the end, seek to the beginning
                            const currentPosition = TrackPlayer.getProgress();
                            if (currentPosition.position >= currentPosition.duration) {
                                TrackPlayer.seekTo(0);
                            }
                            TrackPlayer.play();
                        }
                    }}
                >
                    <Ionicons
                        name={isPianoPlaying ? 'pause' : 'play'}
                        size={48}
                        color={theme === 'light' ? Colors.light.text : Colors.dark.text}
                    />
                </TouchableOpacity>
                <View style={{ width: 350, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 }}>
                    <StyledText style={{ width: 32, textAlign: 'left', color: Colors[theme].text }}>
                        {formatTime(progress.position)}
                    </StyledText>
                    <Slider
                        value={Math.round(progress.position * 100)}
                        minimumValue={0}
                        maximumValue={Math.round(progress.duration * 100)}
                        step={1}
                        onValueChange={async (value: number) => {
                            await TrackPlayer.seekTo(value / 100);
                        }}
                        tapToSeek={true}
                        minimumTrackTintColor={Colors[theme].tint}
                        maximumTrackTintColor={Colors[theme].border}
                        thumbTintColor={Colors[theme].tint}
                        style={{ flex: 1 }}
                    />
                    <StyledText style={{ width: 32, textAlign: 'right', color: Colors[theme].text }}>
                        {formatTime(progress.duration)}
                    </StyledText>
                </View>
            </View>
        )
    };

    const [isZoomedOut, setIsZoomedOut] = useState(true);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const backToTopVisibility = useSharedValue(0);

    useEffect(() => {
        backToTopVisibility.value = withTiming(showBackToTop ? 1 : 0, {
            duration: 180,
            easing: Easing.linear,
        });
    }, [showBackToTop]);

    const onWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'toggleHeader') {
                setIsHeaderVisible((visible) => !visible);
                return;
            }
            if (data.type === 'scrollPosition') {
                setShowBackToTop(!data.atTop);
                return;
            }
            if (Platform.OS === 'android' && data.type === 'horizontalSongSwipe') {
                const songNumbers = Object.keys(songs || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                const currentIndex = songNumbers.indexOf(params.number);
                if (currentIndex < 0) {
                    return;
                }
                if (data.direction === 'right' && currentIndex > 0) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.replace({ pathname: '/display/[id]/[number]', params: { id: params.id, number: songNumbers[currentIndex - 1] } });
                } else if (data.direction === 'left' && currentIndex < songNumbers.length - 1) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.replace({ pathname: '/display/[id]/[number]', params: { id: params.id, number: songNumbers[currentIndex + 1] } });
                }
                return;
            }
            if (Platform.OS === 'ios' && data.type === 'zoomChange') {
                setIsZoomedOut(!!data.isZoomedOut);
            }
        } catch (e) {
            console.error('Failed to parse WebView message', e);
        }
    }, [songs, params.id, params.number]);

    const zoomDetectionJS = `
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

    const scrollToTopJS = `
    window.scrollTo({ top: 0, behavior: 'smooth' });
    true;
    `;

    const webViewSource = useMemo(() => {
        if (!imageData) return undefined;
        return { html: imageData };
    }, [imageData]);

    const applyWebViewHeaderCompensation = useCallback(() => {
        const topPadding = !isIos26OrNewer ? visibleHeaderBarHeight : 0;
        const js = `
        (function() {
            const id = '__acchymns_header_compensation';
            let styleTag = document.getElementById(id);
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = id;
                document.head.appendChild(styleTag);
            }
            styleTag.textContent = 'html, body { padding-top: ${topPadding}px !important; box-sizing: border-box; }';
        })();
        true;
        `;
        webViewRef.current?.injectJavaScript(js);
    }, [isIos26OrNewer, visibleHeaderBarHeight]);

    const handleScrollToTop = useCallback(() => {
        webViewRef.current?.injectJavaScript(scrollToTopJS);
    }, []);

    useEffect(() => {
        applyWebViewHeaderCompensation();
    }, [applyWebViewHeaderCompensation]);

    const shouldShowFauxHeader = !isIos26OrNewer;
    const fauxHeaderOpacity = useSharedValue(
        shouldShowFauxHeader && isHeaderVisible ? 1 : 0
    );

    useEffect(() => {
        fauxHeaderOpacity.value = withTiming(
            shouldShowFauxHeader && isHeaderVisible ? 1 : 0,
            {
                duration: 140,
                easing: Easing.linear,
            }
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
            // Faux background should match the full header container region.
            height: headerHeight,
            backgroundColor: Colors[theme].background,
            zIndex: 10,
        };
    }, [headerHeight, shouldShowFauxHeader, theme]);

    const offset = useSharedValue(0);
    const MAX_OFFSET = 75;
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: offset.value }],
    }));
    const backToTopAnimatedStyle = useAnimatedStyle(() => ({
        opacity: isLiquidGlass ? 1 : backToTopVisibility.value,
    }));
    const backToTopContentAnimatedStyle = useAnimatedStyle(() => ({
        opacity: backToTopVisibility.value,
    }));
    const isSwipingRight = useSharedValue(false);
    const isSwipingLeft = useSharedValue(false);

    function haptic() {
        'worklet';
        scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
    }

    const iosSheetMusicGestures = useMemo(() => {
        if (Platform.OS !== 'ios') {
            return undefined;
        }
        return Gesture.Pan()
            .minPointers(1)
            .maxPointers(1)
            .enabled(isZoomedOut)
            .onStart(() => {
                'worklet';
            })
            .onUpdate((event) => {
                'worklet';
                if (event.translationX > 0) {
                    offset.value = Math.min(event.translationX, MAX_OFFSET);
                } else {
                    offset.value = Math.max(event.translationX, -MAX_OFFSET);
                }
                const distance = Math.abs(offset.value);
                if (distance > MAX_OFFSET / 2) {
                    if (offset.value < 0) {
                        if (!isSwipingLeft.value) {
                            haptic();
                            isSwipingLeft.value = true;
                        }
                    } else {
                        if (!isSwipingRight.value) {
                            haptic();
                            isSwipingRight.value = true;
                        }
                    }
                } else {
                    if (isSwipingLeft.value || isSwipingRight.value) {
                        haptic();
                    }
                    isSwipingLeft.value = false;
                    isSwipingRight.value = false;
                }
            })
            .onEnd(() => {
                'worklet';
                if (Math.abs(offset.value) > MAX_OFFSET / 2) {
                    if (offset.value > 0) {
                        const songNumbers = Object.keys(songs || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                        const currentIndex = songNumbers.indexOf(params.number);
                        if (currentIndex > 0) {
                            scheduleOnRN(router.replace, { pathname: '/display/[id]/[number]', params: { id: params.id, number: songNumbers[currentIndex - 1] } });
                        }
                    } else {
                        const songNumbers = Object.keys(songs || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                        const currentIndex = songNumbers.indexOf(params.number);
                        if (currentIndex < songNumbers.length - 1) {
                            scheduleOnRN(router.replace, { pathname: '/display/[id]/[number]', params: { id: params.id, number: songNumbers[currentIndex + 1] } });
                        }
                    }
                }
                offset.value = withSpring(0, { damping: 100, mass: 0.1 });
            });
    }, [isZoomedOut, params.id, params.number, songs]);


    return (
        <View style={[styles.container]}>
            <Stack.Screen options={headerOptions} />
            {fauxHeaderBackgroundStyle ? (
                <Animated.View
                    pointerEvents="none"
                    style={[fauxHeaderBackgroundStyle, fauxHeaderAnimatedStyle]}
                />
            ) : null}
            {imageData ? (
                Platform.OS === 'ios' && iosSheetMusicGestures ? (
                    <GestureDetector gesture={iosSheetMusicGestures}>
                        <Animated.View
                            style={[
                                animatedStyle,
                                {
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    width: '100%',
                                },
                            ]}
                        >
                            {(() => {
                                const songNumbers = Object.keys(songs || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                                const currentIndex = songNumbers.indexOf(params.number);
                                if (currentIndex <= 0) return null;
                                return (
                                    <View style={{ position: 'absolute', left: -60, top: 0, bottom: 0, justifyContent: 'center' }}>
                                        <StyledText style={{ fontSize: 18, fontWeight: 600, color: Colors[theme]['text'], backgroundColor: Colors[theme].headerBackground, paddingVertical: 16, paddingHorizontal: 8, borderRadius: 8, minWidth: 50, textAlign: 'center' }}>
                                            {songNumbers[currentIndex - 1]}
                                        </StyledText>
                                    </View>
                                );
                            })()}
                            <WebView
                                ref={webViewRef}
                                style={styles.container}
                                originWhitelist={['*']}
                                source={webViewSource}
                                setBuiltInZoomControls={true}
                                injectedJavaScript={zoomDetectionJS}
                                onMessage={onWebViewMessage}
                                onLoadEnd={applyWebViewHeaderCompensation}
                            />
                            {(() => {
                                const songNumbers = Object.keys(songs || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                                const currentIndex = songNumbers.indexOf(params.number);
                                if (currentIndex >= songNumbers.length - 1) return null;
                                return (
                                    <View style={{ position: 'absolute', right: -60, top: 0, bottom: 0, justifyContent: 'center' }}>
                                        <StyledText style={{ fontSize: 18, fontWeight: 600, color: Colors[theme]['text'], backgroundColor: Colors[theme].headerBackground, paddingVertical: 16, paddingHorizontal: 8, borderRadius: 8, minWidth: 50, textAlign: 'center' }}>
                                            {songNumbers[currentIndex + 1]}
                                        </StyledText>
                                    </View>
                                );
                            })()}
                        </Animated.View>
                    </GestureDetector>
                ) : (
                    <View
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            width: '100%',
                        }}
                    >
                        {(() => {
                            const songNumbers = Object.keys(songs || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                            const currentIndex = songNumbers.indexOf(params.number);
                            if (currentIndex <= 0) return null;
                            return (
                                <View style={{ position: 'absolute', left: -60, top: 0, bottom: 0, justifyContent: 'center' }}>
                                    <StyledText style={{ fontSize: 18, fontWeight: 600, color: Colors[theme]['text'], backgroundColor: Colors[theme].headerBackground, paddingVertical: 16, paddingHorizontal: 8, borderRadius: 8, minWidth: 50, textAlign: 'center' }}>
                                        {songNumbers[currentIndex - 1]}
                                    </StyledText>
                                </View>
                            );
                        })()}
                        <WebView
                            ref={webViewRef}
                            style={styles.container}
                            originWhitelist={['*']}
                            source={webViewSource}
                            setBuiltInZoomControls={true}
                            injectedJavaScript={zoomDetectionJS}
                            nestedScrollEnabled
                            onMessage={onWebViewMessage}
                            onLoadEnd={applyWebViewHeaderCompensation}
                        />
                        {(() => {
                            const songNumbers = Object.keys(songs || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                            const currentIndex = songNumbers.indexOf(params.number);
                            if (currentIndex >= songNumbers.length - 1) return null;
                            return (
                                <View style={{ position: 'absolute', right: -60, top: 0, bottom: 0, justifyContent: 'center' }}>
                                    <StyledText style={{ fontSize: 18, fontWeight: 600, color: Colors[theme]['text'], backgroundColor: Colors[theme].headerBackground, paddingVertical: 16, paddingHorizontal: 8, borderRadius: 8, minWidth: 50, textAlign: 'center' }}>
                                        {songNumbers[currentIndex + 1]}
                                    </StyledText>
                                </View>
                            );
                        })()}
                    </View>
                )
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" />
                </View>
            )}
            <BottomSheetModalProvider>
                <BottomSheetModal
                    ref={bottomSheetModalRef}
                    onChange={handleSheetChanges}
                    style={styles.bottomSheet}
                    backgroundStyle={styles.bottomSheet}
                    handleIndicatorStyle={styles.handleIndicator}
                    enablePanDownToClose={true}
                    enableContentPanningGesture={false}
                >
                    <BottomSheetView style={styles.contentContainer}>
                        <SegmentedControl
                            style={{
                                width: hasPiano ? 300 : 100,
                                height: 32,
                            }}
                            appearance={theme}
                            selectedIndex={selectedIndex}
                            values={hasPiano ? [i18n.t('notes'), i18n.t('piano')] : [i18n.t('notes')]}
                            onChange={(event) => {
                                setSelectedIndex(event.nativeEvent.selectedSegmentIndex);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                        />
                        {selectedIndex === 0 && (
                            NotesTab()
                        )}
                        {selectedIndex === 1 && (
                            PianoTab()
                        )}

                    </BottomSheetView>
                </BottomSheetModal>
            </BottomSheetModalProvider>
            {imageData && (
                <Animated.View
                    style={[styles.backToTopButtonContainer, backToTopAnimatedStyle]}
                    pointerEvents={showBackToTop ? 'auto' : 'none'}
                >
                    {isLiquidGlass ? (
                        <GlassView
                            style={styles.liquidGlassButton}
                            glassEffectStyle={{
                                style: showBackToTop ? 'clear' : 'none',
                                animate: true,
                                animationDuration: 0.2,
                            }}
                        >
                            <Animated.View style={[styles.liquidGlassContent, backToTopContentAnimatedStyle]}>
                                <TouchableOpacity
                                    style={styles.liquidGlassTouchTarget}
                                    onPress={handleScrollToTop}
                                    activeOpacity={0.9}
                                >
                                    <Ionicons name="chevron-up" size={22} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                                </TouchableOpacity>
                            </Animated.View>
                        </GlassView>
                    ) : (
                        <TouchableOpacity
                            style={styles.backToTopButton}
                            onPress={handleScrollToTop}
                            activeOpacity={0.9}
                        >
                            <Ionicons name="chevron-up" size={22} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                        </TouchableOpacity>
                    )}
                </Animated.View>
            )}
        </View>
    );
}

function makeStyles(theme: "light" | "dark", useSwiftUIBottomSheet: boolean, invertSheetMusic: boolean) {
    return StyleSheet.create({
        noteButton: {
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
        },
        handleIndicator: {
            backgroundColor: Colors[theme]['border'],
        },
        container: {
            flex: 1,
            backgroundColor: Colors[theme]['songBackground'],
        },
        contentContainer: {
            flex: 1,
            paddingTop: useSwiftUIBottomSheet ? 24 : 8,
            paddingHorizontal: 8,
            paddingBottom: 50,
            alignItems: 'center',
        },
        swiftUIBottomSheetHost: {
            width: 1,
            height: 1,
            opacity: 0,
        },
        bottomSheet: {
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: 7,
            },
            shadowOpacity: 0.43,
            shadowRadius: 9.51,

            elevation: 15,
            backgroundColor: Colors[theme]['settingsButton'],
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
        },
        backToTopButton: {
            backgroundColor: Colors[theme]['settingsButton'],
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.3,
            shadowRadius: 4.65,
            elevation: 8,
        },
        liquidGlassButton: {
            width: 48,
            height: 48,
            borderRadius: 24,
            overflow: 'hidden',
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.22,
            shadowRadius: 5.5,
            elevation: 6,
        },
        liquidGlassContent: {
            width: '100%',
            height: '100%',
        },
        liquidGlassTouchTarget: {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Colors[theme === 'dark' ? (invertSheetMusic ? 'dark' : 'light') : 'light'].liquidGlassFrosted,
        },
        backToTopButtonContainer: {
            position: 'absolute',
            right: 20,
            bottom: 24,
        }
    });
}    