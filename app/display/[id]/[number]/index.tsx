import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Image, Text, ActivityIndicator, useColorScheme, TouchableOpacity, StyleSheet, Button, Linking, ScrollView, Dimensions, Alert } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Bookmark, BookSummary, Song, SongList } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Share } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
    BottomSheetModal,
    BottomSheetView,
    BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { DisplayMoreMenu } from '@/components/DisplayMoreMenu';
import NoteButton from '@/components/NoteButton';
import { getNoteMp3, Note, notePngs } from '@/constants/assets';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getHTMLStringFromSong, getImageData } from '@/scripts/image_handler';
import Slider from '@react-native-community/slider';
import { compareTitles, searchHymnary, SearchResult } from '@/scripts/hymnary_api';
import { Ionicons } from '@expo/vector-icons';
import { error } from 'pdf-lib';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { usePostHog } from 'posthog-react-native';
import { translations } from '@/constants/localization';
import { Canvas, useImage, Image as SkiaImage, Paint, Skia, ColorMatrix } from '@shopify/react-native-skia';
import StyledText from '@/components/StyledText';
import TrackPlayer, { State, usePlaybackState, useProgress } from 'react-native-track-player';
import { useBookData } from '@/hooks/useBookData';
import { useSongData } from '@/hooks/useSongData';
import { useSongListData } from '@/hooks/useSongListData';
import WebView from 'react-native-webview';
import { useHeaderHeight } from '@react-navigation/elements';
import { useReportAPI } from '@/scripts/report';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleOnRN } from 'react-native-worklets';
import { ScreenHeight } from 'react-native-elements/dist/helpers';

export default function DisplayScreen() {
    const params = useLocalSearchParams<{ id: string, number: string }>();
    const theme = useColorScheme() ?? 'light';
    const headerHeight = useHeaderHeight();
    const { height } = Dimensions.get('window');
    const headerHeightRatio = headerHeight / height;

    const context = useContext(HymnalContext);
    const BOOKMARKS_KEY = 'bookmarks';
    const [existingBookmarks, setExistingBookmarks] = useState<Bookmark[]>([]);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const reportAPI = useReportAPI();
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

            setHeaderOptions();
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
            setHeaderOptions();
        } catch (error) {
            console.error("Error removing bookmark:", error);
        }
    };



    const reportIssue = async () => {
        Alert.alert(i18n.t('reportIssue'), i18n.t('reportIssueMessage'), [
            {
                text: i18n.t('cancel'),
                onPress: () => {

                },
                style: 'cancel',
                isPreferred: true
            },
            {
                text: i18n.t('reportIssue'),
                onPress: async () => {
                    let result = await reportAPI.report({
                        book: params.id,
                        number: params.number ?? '',
                    });
                    if (result) {
                        Alert.alert(i18n.t('reportIssueSuccess'));
                    } else {
                        Alert.alert(i18n.t('reportIssueFailure'));
                    }
                },
                style: 'destructive'
            },
        ]);
    }
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
    const styles = makeStyles(theme);
    const scrollRef = useRef<ScrollView | null>(null);
    const [isSwiping, setIsSwiping] = useState(false);

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const isModalOpenRef = useRef(false);

    const handlePress = useCallback(() => {
        if (!bottomSheetModalRef.current) return;

        if (isModalOpenRef.current) {
            bottomSheetModalRef.current.dismiss();
        } else {
            bottomSheetModalRef.current.present();
        }
    }, []);

    const handleSheetChanges = useCallback((index: number) => {
        isModalOpenRef.current = index === 0;
    }, []);

    function openDetailsPage() {
        router.navigate({ pathname: '/display/[id]/[number]/details', params: { id: params.id, number: params.number } });
    }

    useLayoutEffect(() => {
        if (!context) return;
        context.openDetailsBottomSheet = openDetailsPage;
    }, [context]);

    function setHeaderOptions() {
        let initial = [{
            type: 'button',
            label: 'Music',
            icon: {
                type: 'sfSymbol',
                name: 'music.quarternote.3',
            },
            tintColor: Colors[theme].icon,
            onPress: () => {
                handlePress();
            },
        }];

        const m = {
            type: 'menu',
            label: '',
            icon: {
                type: 'sfSymbol',
                name: 'ellipsis',
            },
            tintColor: Colors[theme].icon,
            menu: {
                title: 'Options',
                items: [
                    {
                        type: 'action',
                        label: isBookmarked ? i18n.t('removeBookmark') : i18n.t('saveBookmark'),
                        icon: {
                            type: 'sfSymbol',
                            name: 'bookmark',
                        },
                        onPress: async () => {
                            await addBookmark({
                                book: params.id,
                                number: params.number ?? '',
                            })
                        },
                    }, {
                        type: 'action',
                        label: i18n.t("share"),
                        icon: {
                            type: 'sfSymbol',
                            name: 'square.and.arrow.up',
                        },
                        onPress: async () => {
                            await Share.share({
                                message: ``,
                                url: `https://acchymns.app/display/${params.id}/${params.number}`
                            })
                        },
                    }, {
                        type: 'action',
                        label: i18n.t('reportIssue'),
                        destructive: true,
                        icon: {
                            type: 'sfSymbol',
                            name: 'exclamationmark.bubble',
                        },
                        onPress: () => {
                            reportIssue();
                        },
                    }
                ],
            },
        };

        navigation.setOptions({
            title: "",
            unstable_headerLeftItems: () => [
                {
                    type: 'button',
                    label: 'Back',
                    icon: {
                        type: 'sfSymbol',
                        name: 'chevron.left'
                    },
                    tintColor: Colors[theme].icon,
                    onPress: () => {
                        router.back();
                    }
                }
            ],
            unstable_headerRightItems: () => songNotes.length > 0 ? [...initial, m] : [m],
        });
    }

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            setHeaderOptions();
        });
        setHeaderOptions();

        return unsubscribe;
    }, [navigation, songNotes, existingBookmarks, isBookmarked]);

    // piano
    const progress = useProgress();
    const playerState = usePlaybackState();
    const isPianoPlaying = playerState.state === State.Playing;
    const [hasPiano, setHasPiano] = useState(false);

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

                console.log('Navigating to:', nextRoute.name);
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
                const inverted = context?.invertSheetMusic ?? false;
                const shouldInvert = inverted && theme === 'dark';

                const imageData = await getHTMLStringFromSong(book, params.number, shouldInvert, theme, headerHeightRatio);
                if (!imageData) return;
                setImageData(imageData);

                // try and load piano sound
                const URL = `https://acchymnsmedia.s3.us-east-2.amazonaws.com/${params.id}/${params.number}.mp3`;
                // Check if the mp3 exists before creating the player
                try {
                    const response = await fetch(URL, { method: 'HEAD' });
                    if (response.ok) {
                        setHasPiano(true);

                        const track_data = {
                            url: URL, // Load media from the network
                            title: songs[params.number].title,
                            artist: book.name.medium,
                            artwork: 'https://raw.githubusercontent.com/ACC-Hymns/acchymns-rn/refs/heads/main/assets/icons/ios-dark.png', // Load artwork from the network
                        };
                        await TrackPlayer.reset();
                        await TrackPlayer.add([track_data]);
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

                const imageData = await getHTMLStringFromSong(book, params.number, shouldInvert, theme, headerHeightRatio);
                if (!imageData) return;
                setImageData(imageData);

                // set song notes
                const songNotes = songs[params.number].notes;
                // reverse notes
                const reversedNotes = songNotes?.slice().reverse();
                setSongNotes(reversedNotes || []);
                for (const note of reversedNotes || []) {
                    const assetId = getNoteMp3(note);
                    const player = createAudioPlayer(assetId);
                    audioPlayers.current.push(player);
                }
                setHeaderOptions();

                await setAudioModeAsync({
                    playsInSilentMode: true,
                    interruptionMode: 'mixWithOthers',
                    interruptionModeAndroid: 'duckOthers'
                })
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

            // Clean up TrackPlayer asynchronously
            (async () => {
                await TrackPlayer.reset();
            })();
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
                player.seekTo(0);
                player.play();
            } catch (error) {
                console.log("Error playing note. Attempting to recreate player...");
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
                    minHeight: 100, // Ensures consistent height
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
                    minHeight: 100, // Ensures consistent height
                }}
            >
                <TouchableOpacity
                    style={{
                        marginTop: 8
                    }}
                    onPress={async () => {
                        const state = await TrackPlayer.getPlaybackState()
                        if (state.state === State.Playing)
                            await TrackPlayer.pause();
                        else
                            await TrackPlayer.play();
                    }}
                >
                    <IconSymbol
                        name={isPianoPlaying ? 'pause.fill' : 'play.fill'}
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
                        style={{ flex: 1 }}
                    />
                    <StyledText style={{ width: 32, textAlign: 'right', color: Colors[theme].text }}>
                        {formatTime(progress.duration)}
                    </StyledText>
                </View>
            </View>
        )
    };

    const offset = useSharedValue(0);
    const MAX_OFFSET = 75;
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateX: offset.value,
                },
            ],
        }
    });
    const isSwipingRight = useSharedValue(false);
    const isSwipingLeft = useSharedValue(false);

    function haptic() {
        'worklet';
        scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
    }

    const swipeGesture = Gesture.Pan()
        .onStart(() => {
        })
        .onUpdate((event) => {
            if (event.translationX > 0) {
                offset.value = Math.min(event.translationX, MAX_OFFSET);
            } else {
                offset.value = Math.max(event.translationX, -MAX_OFFSET);
            }
            const distance = Math.abs(offset.value);
            if (distance > MAX_OFFSET / 2) {
                // if swiping left, set to 0
                if (offset.value < 0) {
                    if (!isSwipingLeft.value) {
                        haptic()
                        isSwipingLeft.value = true;
                    }
                } else {
                    if (!isSwipingRight.value) {
                        haptic()
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
            if (Math.abs(offset.value) > MAX_OFFSET / 2) {
                if (offset.value > 0) {
                    // Swipe right
                    const songNumbers = Object.keys(songs || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                    const currentIndex = songNumbers.indexOf(params.number);
                    if (currentIndex > 0) {
                        scheduleOnRN(router.replace, { pathname: '/display/[id]/[number]', params: { id: params.id, number: songNumbers[currentIndex - 1] } });
                    }

                } else {
                    // Swipe left
                    const songNumbers = Object.keys(songs || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                    const currentIndex = songNumbers.indexOf(params.number);
                    if (currentIndex < songNumbers.length - 1) {
                        scheduleOnRN(router.replace, { pathname: '/display/[id]/[number]', params: { id: params.id, number: songNumbers[currentIndex + 1] } });
                    }
                }
            }
            offset.value = withSpring(0, { damping: 100, mass: 0.1 },);
        })
        .requireExternalGestureToFail();

    return (
        <View style={[styles.container]}>
            {imageData ? (
                <GestureDetector gesture={swipeGesture}>
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
                        {/* Offscreen left text */}
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
                        {/* Main ScrollView takes full width */}
                        <WebView
                            style={styles.container}
                            originWhitelist={['*']}
                            source={{ html: imageData }}>

                        </WebView>
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
                    enableContentPanningGesture={false}
                >
                    <BottomSheetView style={styles.contentContainer}>
                        <SegmentedControl
                            style={{
                                width: hasPiano ? 300 : 100,
                                height: 32,
                            }}
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
        </View>
    );
}

function makeStyles(theme: "light" | "dark") {
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
            padding: 8,
            paddingBottom: 50,
            alignItems: 'center',
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
        }
    });
}    