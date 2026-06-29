import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, Image, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Button, Linking, ScrollView, Platform, useWindowDimensions, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Alert from '@blazejkustra/react-native-alert';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { router, Stack, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BookSummary, SongList } from '@/constants/types';
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
import { useDisplayMoreMenu } from '@/hooks/useDisplayMoreMenu';
import { showReportIssuePrompt } from '@/components/ReportIssuePrompt';
import NoteButton from '@/components/NoteButton';
import { getNoteMp3, Note, notePngs } from '@/constants/assets';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';

const NOTE_PLAYER_OPTIONS = { keepAudioSessionActive: true } as const;
import { getHTMLStringFromSong } from '@/scripts/image_handler';
import Slider from '@react-native-community/slider';
import { compareTitles, searchHymnary, SearchResult } from '@/scripts/hymnary_api';
import { useReportAPI } from '@/scripts/report';
import Ionicons from '@react-native-vector-icons/ionicons'
import { error } from 'pdf-lib';
import { usePostHog } from 'posthog-react-native';
import { useI18n } from '@/hooks/useI18n';
import { useEcampDisplayState } from '@/hooks/useEcampDisplayState';
import {
    getEcampBannerBackToTopBottom,
    getEcampBannerBottomInset,
} from '@/constants/ecampBanner';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Canvas, useImage, Image as SkiaImage, Paint, Skia, ColorMatrix } from '@shopify/react-native-skia';
import StyledText from '@/components/StyledText';
import TrackPlayer, { PlaybackState, useIsPlaying, usePlaybackState, useProgress } from '@rntp/player';
import { useBookData } from '@/hooks/useBookData';
import { useSongData } from '@/hooks/useSongData';
import { useSongListData } from '@/hooks/useSongListData';
import WebView from 'react-native-webview';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { scheduleOnRN } from 'react-native-worklets';
import { ScreenHeight } from 'react-native-elements/dist/helpers';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as SwiftUI from '@expo/ui/swift-ui';
import { presentationDetents } from '@expo/ui/swift-ui/modifiers';
import { isIOS26DesignEnabled } from '@/constants/iosDesign';
import { configureTrackPlayerCommands } from '@/constants/trackPlayer';

const MUSIC_SHEET_BASE_HEIGHT = 280;

function isLandscapeOrientation(orientation: ScreenOrientation.Orientation) {
    return orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT
        || orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
}

const BACK_TO_TOP_BUTTON_SIZE = 48;
const BACK_TO_TOP_BUTTON_MARGIN_RIGHT = 20;
const BACK_TO_TOP_BUTTON_MARGIN_BOTTOM = 24;

type DisplayHeaderToolbarProps = {
    isHeaderVisible: boolean;
    theme: 'light' | 'dark';
    songNotesCount: number;
    hasBroadcasting: boolean;
    bookId: string;
    songId: string;
    onBack: () => void;
    onMusicPress: () => void;
    onBroadcast: () => void;
    onReportIssuePress: () => void;
};

function DisplayHeaderToolbar({
    isHeaderVisible,
    theme,
    songNotesCount,
    hasBroadcasting,
    bookId,
    songId,
    onBack,
    onMusicPress,
    onBroadcast,
    onReportIssuePress,
}: DisplayHeaderToolbarProps) {
    const iconColor = Colors[theme].icon;
    const hidden = !isHeaderVisible;
    const {
        i18n,
        isBookmarked,
        toggleBookmark,
        shareSong,
        openReportIssueAfterMenuCloses,
        bookmarkLabel,
    } = useDisplayMoreMenu({ bookId, songId, onReportIssuePress });

    return (
        <>
            <Stack.Toolbar placement="left">
                <Stack.Toolbar.Button
                    icon="chevron.left"
                    onPress={onBack}
                    hidden={hidden}
                    tintColor={iconColor}
                />
            </Stack.Toolbar>
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    icon="music.quarternote.3"
                    onPress={onMusicPress}
                    hidden={hidden || songNotesCount === 0}
                    tintColor={iconColor}
                />
                <Stack.Toolbar.Button
                    icon="dot.radiowaves.left.and.right"
                    onPress={onBroadcast}
                    hidden={hidden || !hasBroadcasting}
                    tintColor={iconColor}
                />
                <Stack.Toolbar.Menu icon="ellipsis" hidden={hidden} tintColor={iconColor}>
                    <Stack.Toolbar.MenuAction
                        icon="bookmark"
                        onPress={toggleBookmark}
                    >
                        {bookmarkLabel}
                    </Stack.Toolbar.MenuAction>
                    <Stack.Toolbar.MenuAction
                        icon="square.and.arrow.up"
                        onPress={shareSong}
                    >
                        {i18n.t('share')}
                    </Stack.Toolbar.MenuAction>
                    <Stack.Toolbar.MenuAction
                        icon="exclamationmark.bubble"
                        destructive
                        onPress={openReportIssueAfterMenuCloses}
                    >
                        {i18n.t('reportIssue')}
                    </Stack.Toolbar.MenuAction>
                </Stack.Toolbar.Menu>
            </Stack.Toolbar>
        </>
    );
}

export default function DisplayScreen() {
    const params = useLocalSearchParams<{ id: string, number: string, openSheet?: string, openPiano?: string }>();
    const theme = useColorScheme() ?? 'light';
    const headerHeight = useHeaderHeight();
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    const headerHeightRatio = headerHeight / windowHeight;
    const musicSheetSnapPoints = useMemo(
        () => Platform.OS === 'android'
            // Android ModalBottomSheet only supports 0%, ~50%, and 100%; two snap points
            // are required so index 0 opens at partial (~50%) instead of full screen.
            ? ['0%', '50%']
            : [Math.min(MUSIC_SHEET_BASE_HEIGHT, Math.floor(windowHeight * 0.25))],
        [windowHeight],
    );
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
    const styles = makeStyles(theme as any, useSwiftUIBottomSheet);
    const scrollRef = useRef<ScrollView | null>(null);
    const webViewRef = useRef<WebView>(null);
    const [isSwiping, setIsSwiping] = useState(false);

    const i18n = useI18n();
    const insets = useSafeAreaInsets();
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
    const [isHorizontal, setIsHorizontal] = useState(false);
    const sheetCloseButtonPosition = useMemo(
        () => ({
            // @expo/ui BottomSheet.ios already adds paddingTop: 16 for the drag indicator.
            top: 0,
            right: isHorizontal ? 0 : 16,
        }),
        [isHorizontal],
    );
    const lastHandledOpenSheetTokenRef = useRef<string | null>(null);
    const [pendingOpenSheetToken, setPendingOpenSheetToken] = useState<string | null>(null);
    const isDisplayFullyLoaded = isDisplayScreenFocused
        && !loading
        && !!book
        && !!songs
        && !!imageData;

    const handlePress = useCallback(async () => {
        if (!bottomSheetModalRef.current) return;

        if (isModalOpenRef.current) {
            bottomSheetModalRef.current.dismiss();
        } else {
            bottomSheetModalRef.current.present();
        }
    }, [useSwiftUIBottomSheet]);

    const handleSheetChanges = useCallback((index: number) => {
        isModalOpenRef.current = index === 0;
        setMusicSheetOpen(index >= 0);
    }, []);

    const handleCloseSheet = useCallback(() => {
        bottomSheetModalRef.current?.dismiss();
    }, []);

    async function broadcastSong() {
        router.navigate({ pathname: '/display/[id]/[number]/broadcast', params: { id: params.id, number: params.number || "" } });
    }

    const headerOptions = useMemo(() => {
        const keepsStaticHeaderSlot = !isIos26OrNewer;
        const shouldShowHeaderChrome = isHeaderVisible;
        const options = {
            title: "",
            // On iOS <26 and Android, keep header mounted to avoid content jump.
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
    const [hasPiano, setHasPiano] = useState(false);
    const progress = useProgress(hasPiano ? 0.25 : 1);
    const isPianoPlaying = useIsPlaying();
    const [pianoSeekOverride, setPianoSeekOverride] = useState<number | null>(null);
    const pianoSeekReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pianoDuration = progress.duration > 0 ? progress.duration : 0;
    const pianoPosition = pianoSeekOverride ?? progress.position;
    const canSeekPiano = pianoDuration > 0;

    const clearPianoSeekOverride = useCallback(() => {
        if (pianoSeekReleaseTimeoutRef.current) {
            clearTimeout(pianoSeekReleaseTimeoutRef.current);
            pianoSeekReleaseTimeoutRef.current = null;
        }
        setPianoSeekOverride(null);
    }, []);

    useEffect(() => {
        clearPianoSeekOverride();
    }, [params.id, params.number, clearPianoSeekOverride]);

    useEffect(() => {
        if (pianoSeekOverride === null) {
            return;
        }
        if (Math.abs(progress.position - pianoSeekOverride) <= 1) {
            clearPianoSeekOverride();
        }
    }, [clearPianoSeekOverride, pianoSeekOverride, progress.position]);

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
            const updateIsHorizontal = async () => {
                const orientation = await ScreenOrientation.getOrientationAsync();
                setIsHorizontal(isLandscapeOrientation(orientation));
            };

            void updateIsHorizontal();
            const subscription = ScreenOrientation.addOrientationChangeListener(() => {
                void updateIsHorizontal();
            });

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

                        // if the same track is already active, just refresh media-session commands
                        const currentTrack = TrackPlayer.getActiveMediaItem();
                        if (currentTrack?.mediaId === `${params.id}:${params.number}`) {
                            configureTrackPlayerCommands();
                            return;
                        }

                        const track_data = {
                            mediaId: `${params.id}:${params.number}`,
                            url: URL, // Load media from the network
                            title: songs[params.number].title,
                            artist: book.name.medium,
                            artworkUrl: 'https://raw.githubusercontent.com/ACC-Hymns/acchymns-rn/refs/heads/main/assets/icons/ios-dark.png', // Load artwork from the network
                        };
                        TrackPlayer.preload(track_data);
                        TrackPlayer.setMediaItem(track_data);
                        configureTrackPlayerCommands();
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
                    const player = createAudioPlayer(assetId, NOTE_PLAYER_OPTIONS);
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
                audioPlayers.current[id] = createAudioPlayer(getNoteMp3(note), NOTE_PLAYER_OPTIONS);
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
                        {formatTime(pianoPosition)}
                    </StyledText>
                    <Slider
                        value={pianoPosition}
                        minimumValue={0}
                        maximumValue={pianoDuration || 1}
                        step={1}
                        disabled={!canSeekPiano}
                        onValueChange={(value: number) => {
                            setPianoSeekOverride(value);
                        }}
                        onSlidingComplete={(value: number) => {
                            setPianoSeekOverride(value);
                            TrackPlayer.seekTo(value);
                            if (pianoSeekReleaseTimeoutRef.current) {
                                clearTimeout(pianoSeekReleaseTimeoutRef.current);
                            }
                            pianoSeekReleaseTimeoutRef.current = setTimeout(() => {
                                pianoSeekReleaseTimeoutRef.current = null;
                                setPianoSeekOverride(null);
                            }, 1500);
                        }}
                        tapToSeek={true}
                        minimumTrackTintColor={Colors[theme].tint}
                        maximumTrackTintColor={Colors[theme].border}
                        thumbTintColor={Colors[theme].tint}
                        style={{ flex: 1 }}
                    />
                    <StyledText style={{ width: 32, textAlign: 'right', color: Colors[theme].text }}>
                        {formatTime(pianoDuration)}
                    </StyledText>
                </View>
            </View>
        )
    };

    const [isZoomedOut, setIsZoomedOut] = useState(true);
    const [showBackToTop, setShowBackToTop] = useState(false);

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
        const bottomPadding = 40;
        const js = `
        (function() {
            const id = '__acchymns_header_compensation';
            let styleTag = document.getElementById(id);
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = id;
                document.head.appendChild(styleTag);
            }
            styleTag.textContent = 'html, body { padding-top: ${topPadding}px !important; padding-bottom: ${bottomPadding}px !important; box-sizing: border-box; }';
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
            {isIos26OrNewer ? (
                <DisplayHeaderToolbar
                    isHeaderVisible={isHeaderVisible}
                    theme={theme as 'light' | 'dark'}
                    songNotesCount={songNotes.length}
                    hasBroadcasting={!!context?.broadcastingToken}
                    bookId={params.id}
                    songId={params.number ?? ''}
                    onBack={() => router.back()}
                    onMusicPress={handlePress}
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
                    style={isLiquidGlass ? undefined : styles.bottomSheet}
                    backgroundStyle={isLiquidGlass ? undefined : styles.bottomSheet}
                    handleIndicatorStyle={styles.handleIndicator}
                    enablePanDownToClose={true}
                    enableContentPanningGesture={false}
                    enableDynamicSizing={false}
                    snapPoints={musicSheetSnapPoints}
                >
                    <BottomSheetView style={styles.contentContainer}>
                        {isHorizontal && (
                            <View
                                style={[styles.sheetCloseButtonContainer, sheetCloseButtonPosition]}
                                pointerEvents="box-none"
                            >
                                <TouchableOpacity
                                    onPress={handleCloseSheet}
                                    activeOpacity={0.9}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                >
                                    <Ionicons name="close" size={22} color={Colors[theme].icon} />
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.sheetContent}>
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
                        </View>
                    </BottomSheetView>
                </BottomSheetModal>
            </BottomSheetModalProvider>
            {imageData && isLiquidGlass && showBackToTop ? (
                <GlassView
                    style={[styles.backToTopButtonContainer, { bottom: backToTopBottom }]}
                    isInteractive
                >
                    <TouchableOpacity
                        style={[
                            styles.backToTopButton,
                        ]}
                        onPress={handleScrollToTop}
                        activeOpacity={0.9}
                    >
                        <Ionicons name="chevron-up" size={22} color={Colors[theme].icon} />
                    </TouchableOpacity>
                </GlassView>
            ) : null}
            {imageData && !isLiquidGlass && showBackToTop ? (
                <View
                    style={[styles.backToTopButtonContainer, { bottom: backToTopBottom }]}
                    pointerEvents="auto"
                >
                    <TouchableOpacity
                        style={[
                            styles.backToTopButton,
                            { backgroundColor: Colors[theme].settingsButton },
                        ]}
                        onPress={handleScrollToTop}
                        activeOpacity={0.9}
                    >
                        <Ionicons name="chevron-up" size={22} color={Colors[theme].icon} />
                    </TouchableOpacity>
                </View>
            ) : null}
        </View>
    );
}

function makeStyles(theme: "light" | "dark", useSwiftUIBottomSheet: boolean) {
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
            paddingBottom: 50,
            overflow: 'visible',
        },
        sheetContent: {
            paddingTop: useSwiftUIBottomSheet ? 24 : 8,
            paddingHorizontal: 8,
            alignItems: 'center',
        },
        sheetCloseButtonContainer: {
            position: 'absolute',
            zIndex: 1,
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
            width: BACK_TO_TOP_BUTTON_SIZE,
            height: BACK_TO_TOP_BUTTON_SIZE,
            borderRadius: BACK_TO_TOP_BUTTON_SIZE / 2,
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
            flex: 1,
            borderRadius: BACK_TO_TOP_BUTTON_SIZE / 2,
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
        liquidGlassTouchTarget: {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
        backToTopButtonContainer: {
            position: 'absolute',
            right: BACK_TO_TOP_BUTTON_MARGIN_RIGHT,
            width: BACK_TO_TOP_BUTTON_SIZE,
            height: BACK_TO_TOP_BUTTON_SIZE,
            borderRadius: BACK_TO_TOP_BUTTON_SIZE / 2,
        }
    });
}    