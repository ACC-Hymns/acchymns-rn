import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Image, Text, ActivityIndicator, useColorScheme, TouchableOpacity, StyleSheet, Button, Linking, ScrollView } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BookSummary, SongList } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
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
import { getImageData } from '@/scripts/image_handler';
import Slider from '@react-native-community/slider';
import { compareTitles, searchHymnary, SearchResult } from '@/scripts/hymnary_api';
import { Ionicons } from '@expo/vector-icons';
import { error } from 'pdf-lib';


export default function DisplayScreen() {
    const params = useLocalSearchParams<{ id: string, number: string }>();
    const theme = useColorScheme() ?? 'light';

    const context = useContext(HymnalContext);
    const [bookData, setBookData] = useState<BookSummary | null>(null);
    const [songData, setSongData] = useState<SongList | null>(null);
    const [songNotes, setSongNotes] = useState<string[]>([]);
    const [imageData, setImageData] = useState<{ uri: string, aspectRatio: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const audioPlayers = useRef<AudioPlayer[]>([]);
    const pianoAudioPlayer = useRef<AudioPlayer | null>(null);
    const navigation = useNavigation();
    const styles = makeStyles(theme);
    const scrollRef = useRef<ScrollView | null>(null);
    const [isPresenting, setIsPresenting] = useState(false);

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

    useLayoutEffect(() => {
        if (!context || !params.id || !params.number) return;
        const bData = context.BOOK_DATA[params.id];
        if (!bData) return;

        setBookData(bData); // still update state for image use later
    }, [context, params.id, params.number]);

    function setHeaderOptions() {
        navigation.setOptions({
            title: params.number,
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
                    { (
                        <TouchableOpacity onPress={handlePress}>
                            <Ionicons
                                name="musical-notes"
                                size={24}
                                color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                            />
                        </TouchableOpacity>
                    )}
                    <DisplayMoreMenu bookId={params.id} songId={params.number} />
                </View>
            ),
        });
    }

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            setHeaderOptions();
        });

        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getSongData(params.id as string);
                setSongData(data);

                // prefetch adjecent songs
                
                const songNumbers = Object.keys(songData || {});
                const currentIndex = songNumbers.indexOf(params.number);
                const nextIndex = currentIndex + 1;
                const prevIndex = currentIndex - 1;
                if (nextIndex < songNumbers.length) {
                    router.prefetch({ pathname: '/display/[id]/[number]', params: { id: params.id, number: songNumbers[nextIndex] } });
                }
                if (prevIndex >= 0) {
                    router.prefetch({ pathname: '/display/[id]/[number]', params: { id: params.id, number: songNumbers[prevIndex] } });
                }

                // load song details
                searchHymnary(data[params.number].title).then((detailData) => {
                    
                    let details = detailData.filter(d => compareTitles(d, data[params.number], 1));
                    if(!details || details.length === 0) {
                        console.log("No details found. Trying without special characters...");
                        details = detailData.filter(d => compareTitles(d, data[params.number], 3));
                        if(!details || details.length === 0) {
                            console.log("No details found.");
                        } else { 
                            // if more than one, take the one with the highest instances (totalInstances)
                            details = details.sort((a, b) => Number.parseInt(b.totalInstances) - Number.parseInt(a.totalInstances));
                            details = details.slice(0, 1);
                            // set song details
                            setSongDetails(details[0]);
                        }
                    } else {
                        // if one has the same first line, take it
                        const firstLine = data[params.number].first_line;
                        if(firstLine) {
                            // set to lower case
                            const lowerFirstLine = firstLine.toLowerCase();
                            // remove special characters
                            const specialFirstLine = lowerFirstLine.replace(/[^a-z0-9]/gi, '');
                            details = details.filter(d => d.firstLine.toLowerCase().replace(/[^a-z0-9]/gi, '').startsWith(specialFirstLine));
                        }

                        // if more than one, take the one with the highest instances (totalInstances)
                        details = details.sort((a, b) => Number.parseInt(b.totalInstances) - Number.parseInt(a.totalInstances));
                        details = details.slice(0, 1);
                        // set song details
                        setSongDetails(details[0]);
                    }
                });

                // set song notes
                const songNotes = data?.[params.number]?.notes;
                // reverse notes
                const reversedNotes = songNotes?.slice().reverse();
                setSongNotes(reversedNotes || []);
                for (const note of reversedNotes || []) {
                    const assetId = getNoteMp3(note);
                    const player = createAudioPlayer(assetId);
                    audioPlayers.current.push(player);
                }

                await setAudioModeAsync({
                    playsInSilentMode: true,
                    interruptionMode: 'mixWithOthers',
                    interruptionModeAndroid: 'duckOthers'
                })

                // if pianoAudioPlayer is already created, release it
                if (pianoAudioPlayer.current) {
                    pianoAudioPlayer.current.release();
                }

                // try and load piano sound
                const URL = `https://acchymnsmedia.s3.us-east-2.amazonaws.com/${params.id}/${params.number}.mp3`;
                // Check if the mp3 exists before creating the player
                try {
                    const response = await fetch(URL, { method: 'HEAD' });
                    if (response.ok) {
                        pianoAudioPlayer.current = createAudioPlayer(URL);
                        pianoAudioPlayer.current.addListener('playbackStatusUpdate', (status) => {
                            if (status.isLoaded) {
                                setCurrentTime(status.currentTime);
                                setDuration(status.duration);

                                if (status.didJustFinish) {
                                    setIsPianoPlaying(false);
                                }
                            }
                        });
                    } else {
                        pianoAudioPlayer.current = null;
                    }
                } catch (e) {
                    pianoAudioPlayer.current = null;
                    console.error(`Error fetching piano mp3`);
                }

                if (!bookData) return;

                const imageData = await getImageData(bookData, params.number);
                if (!imageData) return;
                setImageData(imageData);
            } catch (error) {
                console.error("Error loading song data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Unlock orientation on page load
        ScreenOrientation.unlockAsync();
        const handleOrientationChange = async () => {
            setIsHorizontal(await ScreenOrientation.getOrientationAsync() === ScreenOrientation.Orientation.LANDSCAPE_LEFT || await ScreenOrientation.getOrientationAsync() === ScreenOrientation.Orientation.LANDSCAPE_RIGHT);
        }

        const subscription = ScreenOrientation.addOrientationChangeListener(handleOrientationChange);

        navigation.addListener('beforeRemove', async (e) => {
            console.log("trying to leave");
            if(e.data.action.type == 'GO_BACK') {
                console.log('Locking orientation to portrait');
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            }

            const nextRoute = (e.data?.action?.payload as { name?: string, params: {[key: string]: string}, singular: any });
            console.log('Navigating to:', nextRoute.name);
            if(!nextRoute.name?.startsWith('display')) {
                console.log('Locking orientation to portrait');
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            } else {
                console.log('Unlocking orientation');
                ScreenOrientation.unlockAsync();
            }
            ScreenOrientation.removeOrientationChangeListener(subscription);
        });

        return () => {

            // Clean up audio players
            audioPlayers.current.forEach(player => {
                player.release();
            });
            if (pianoAudioPlayer.current) {
                pianoAudioPlayer.current.release();
            }
        };
    }, [bookData]);

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
                {songData && songData[params.number] && (
                    <>
                        <View style={styles.noteButton}>
                            <NoteButton note={"" as Note} clef={'none'} onClick={() => playAllNotes()} />
                            <Text style={{ fontSize: 18, color: Colors[theme].text }}>All</Text>
                        </View>
                        {songNotes.map((note, index) => (
                            <View key={index} style={styles.noteButton}>
                                <NoteButton note={note as Note} clef={getClef(note)} onClick={() => playNote(note)} />
                                <Text style={{ fontSize: 18, color: Colors[theme].text }}>{note}</Text>
                            </View>
                        ))}
                    </>
                )}
            </View>
        )
    };

    const [isPianoPlaying, setIsPianoPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

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
                    onPress={() => {
                        if (pianoAudioPlayer.current) {
                            if(pianoAudioPlayer.current.playing) {
                                pianoAudioPlayer.current.pause();
                                setIsPianoPlaying(false);
                            } else {
                                // if track is at the end, seek to start
                                if (currentTime >= duration) {
                                    pianoAudioPlayer.current.seekTo(0);
                                    setCurrentTime(0);
                                }

                                pianoAudioPlayer.current.play();
                                setIsPianoPlaying(true);
                            }
                            // taptic
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                    }}
                >
                    {pianoAudioPlayer.current && (
                        <IconSymbol
                            name={isPianoPlaying ? 'pause.fill' : 'play.fill'}
                            size={48}
                            color={theme === 'light' ? Colors.light.text : Colors.dark.text}
                        />
                    )}
                </TouchableOpacity>
                <View style={{ width: 350, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 }}>
                    <Text style={{ width: 32, textAlign: 'left', color: Colors[theme].text}}>
                        {formatTime(currentTime)}
                    </Text>
                    <Slider
                        value={Math.round(currentTime * 100)}
                        minimumValue={0}
                        maximumValue={Math.round(duration * 100)}
                        step={1}
                        onValueChange={(value: number) => {
                            pianoAudioPlayer.current?.pause();
                            setIsPianoPlaying(false);
                            pianoAudioPlayer.current?.seekTo(value / 100);
                        }}
                        tapToSeek={true}
                        minimumTrackTintColor={Colors[theme].tint}
                        maximumTrackTintColor={Colors[theme].border}
                        style={{ flex: 1 }}
                    />
                    <Text style={{ width: 32, textAlign: 'right', color: Colors[theme].text }}>
                        {formatTime(duration)}
                    </Text>
                </View>
            </View>
        )
    };

    const [songDetails, setSongDetails] = useState<SearchResult | null>(null);

    // Details tab
    const DetailsTab = () => {

        return (
            <View style={{
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                flexWrap: 'wrap',
                marginVertical: 16,
                minHeight: 100, // Ensures consistent height
            }}>
                {songData && songData[params.number] ? (
                    <>
                        <Text style={{ fontSize: 20, fontWeight: '600', color: Colors[theme].text, marginBottom: 8 }}>
                            {songData[params.number].title}
                        </Text>
                        {songData[params.number] && (
                            <Text style={{ fontSize: 16, color: Colors[theme].text, textAlign: 'center' }}>
                                Author: {songDetails ? (!/\S/.test(songDetails.authors) ? 'Unknown' : songDetails.authors) : "Unknown"}
                            </Text>
                        )}
                        {songData[params.number] && (
                            <Text style={{ fontSize: 14, color: Colors[theme].text, marginVertical: 4, textAlign: 'center' }}>
                                {songDetails
                                    ? (songDetails.textSources
                                        ? songDetails.textSources.replace(/<[^>]+>/g, '')
                                        : "No details available.")
                                    : "No details available."}
                            </Text>
                        )}
                        {songDetails && songDetails.textAuthNumber && (
                            <Button
                                title="View on Hymnary.org"
                                onPress={() => {
                                    const url = `https://hymnary.org/text/${songDetails.textAuthNumber}`;
                                    Linking.openURL(url);
                                }}>
                            </Button>
                        )}
                    </>
                ) : (
                    <Text style={{ color: Colors[theme].text }}>No details available.</Text>
                )}
            </View>
        )
    }

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
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
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
            if(distance > MAX_OFFSET/2) {
                // if swiping left, set to 0
                if (offset.value < 0) {
                    if(!isSwipingLeft.value) {
                        haptic()
                        isSwipingLeft.value = true;
                    }
                } else {
                    if(!isSwipingRight.value) {
                        haptic()
                        isSwipingRight.value = true;
                    }
                }
            } else {
                if(isSwipingLeft.value || isSwipingRight.value) {
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
                    console.log("Swipe left");
                    const songNumbers = Object.keys(songData || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                    const currentIndex = songNumbers.indexOf(params.number);
                    if (currentIndex > 0) {
                        runOnJS(router.replace)({ pathname: '/display/[id]/[number]', params: { id: params.id, number: songNumbers[currentIndex - 1] } });
                    }

                } else {
                    // Swipe left
                    console.log("Swipe right");
                    const songNumbers = Object.keys(songData || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                    const currentIndex = songNumbers.indexOf(params.number);
                    if (currentIndex < songNumbers.length - 1) {
                        runOnJS(router.replace)({ pathname: '/display/[id]/[number]', params: { id: params.id, number: songNumbers[currentIndex + 1] } });
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
                            const songNumbers = Object.keys(songData || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                            const currentIndex = songNumbers.indexOf(params.number);
                            if (currentIndex <= 0) return null;
                            return (
                                <View style={{ position: 'absolute', left: -60, top: 0, bottom: 0, justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 18, fontWeight: 600, color: Colors[theme]['text'], backgroundColor: Colors[theme].headerBackground, paddingVertical: 16, paddingHorizontal: 8, borderRadius: 8, minWidth: 50, textAlign: 'center' }}>
                                        {songNumbers[currentIndex - 1]}
                                    </Text>
                                </View>
                            );
                        })()}
                        {/* Main ScrollView takes full width */}
                        <ScrollView
                            ref={scrollRef}
                            key={isHorizontal ? 'horizontal' : 'vertical'} // Force re-render on orientation change
                            minimumZoomScale={1}
                            maximumZoomScale={5}
                            contentContainerStyle={{ flexGrow: 1 }}
                            style={{ flex: 1, width: '100%' }}
                        >
                            <Image
                                source={{ uri: imageData.uri }}
                                resizeMode="contain"
                                style={{
                                    width: '100%',
                                    height: undefined,
                                    aspectRatio: imageData.aspectRatio,
                                }}
                            />
                        </ScrollView>
                        {(() => {
                            const songNumbers = Object.keys(songData || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                            const currentIndex = songNumbers.indexOf(params.number);
                            if (currentIndex >= songNumbers.length - 1) return null;
                            return (
                                <View style={{ position: 'absolute', right: -60, top: 0, bottom: 0, justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 18, fontWeight: 600, color: Colors[theme]['text'], backgroundColor: Colors[theme].headerBackground, paddingVertical: 16, paddingHorizontal: 8, borderRadius: 8, minWidth: 50, textAlign: 'center' }}>
                                        {songNumbers[currentIndex + 1]}
                                    </Text>
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
                                width: 300,
                                height: 32,
                            }}
                            selectedIndex={selectedIndex}
                            values={pianoAudioPlayer.current ? ['Notes', 'Piano', 'Details'] : ['Notes', 'Details']}
                            onChange={(event) => {
                                setSelectedIndex(event.nativeEvent.selectedSegmentIndex);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                        />
                        {selectedIndex === 0 && (
                            NotesTab()
                        )}
                        {selectedIndex === 1 && (
                            pianoAudioPlayer.current
                                ? PianoTab()
                                : DetailsTab()
                        )}
                        {selectedIndex === 2 && (
                            DetailsTab()
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
            backgroundColor: 'white',
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
            backgroundColor: Colors[theme]['background'],
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
        }
    });
}    