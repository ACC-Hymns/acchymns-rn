import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Image, Text, ActivityIndicator, useColorScheme, TouchableOpacity, StyleSheet } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { GestureHandlerRootView, Pressable, ScrollView, TapGestureHandler } from 'react-native-gesture-handler';
import { BookSummary, SongList } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import * as FileSystem from 'expo-file-system';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Haptics from 'expo-haptics';
import { convert, convertB64 } from 'react-native-pdf-to-image';
import { Colors } from '@/constants/Colors';
import { Zoomable } from '@likashefqet/react-native-image-zoom';
import ZoomableScrollView from '@/components/ZoomableScrollView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
    BottomSheetModal,
    BottomSheetView,
    BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { DisplayMoreMenu } from '@/components/DisplayMoreMenu';
import NoteButton from '@/components/NoteButton';
import { getNoteMp3, Note, notePngs, trebleNotePngs } from '@/constants/assets';
import { AudioPlayer, AudioSample, createAudioPlayer, setAudioModeAsync, useAudioSampleListener } from 'expo-audio';
import { getImageData } from '@/scripts/image_handler';
import { useIsFocused } from '@react-navigation/native';
import Slider from '@react-native-community/slider';

export default function DisplayScreen() {
    const params = useLocalSearchParams<{ id: string, number: string }>();
    const theme = useColorScheme() ?? 'light';
    const MIN_SCALE = 1;
    const MAX_SCALE = 5;

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
                            <IconSymbol
                                name="music.note"
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
                            }
                        });
                        console.log(`Piano mp3 found and player created: ${URL}`);
                    } else {
                        pianoAudioPlayer.current = null;
                        console.log(`Piano mp3 not found: ${URL}`);
                    }
                } catch (e) {
                    pianoAudioPlayer.current = null;
                    console.error(`Error fetching piano mp3: ${URL}`, e);
                }

                if (!bookData) return;

                const imageData = await getImageData(bookData, params.number);
                if (!imageData) return;
                setImageData(imageData);
            } catch (error) {
                console.error("Error loading song data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Unlock orientation on page load
        ScreenOrientation.unlockAsync();
        const handleOrientationChange = () => {
            if (!imageData) return;

            Image.getSize(imageData.uri, (width, height) => {
                // reset zoom scale to 1 on orientation change
                if (scrollRef.current) {
                    scrollRef.current.scrollResponderZoomTo({
                        x: 0,
                        y: 0,
                        width: width,
                        height: height,
                        animated: true,
                    });
                }
            });
        };

        const subscription = ScreenOrientation.addOrientationChangeListener(handleOrientationChange);

        return () => {
            // Lock orientation back to default on exit
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            ScreenOrientation.removeOrientationChangeListener(subscription);

            // Clean up audio players
            audioPlayers.current.forEach(player => {
                player.release();
            });
            if (pianoAudioPlayer.current) {
                pianoAudioPlayer.current.release();
            }
        };
    }, [bookData]);

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
            const player = audioPlayers.current[index];
            if (player) {
                player.seekTo(0);
                player.play();
            }
            // Wait for DELAY ms before playing the next note
            await new Promise(resolve => setTimeout(resolve, DELAY));
        }
    }

    function playNote(note: string) {
        const id = songNotes.indexOf(note);
        if (id < 0) return;
        const player = audioPlayers.current[id];
        if (player) {
            player.seekTo(0);
            player.play();
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

    function audioPlayerListener(data: AudioSample) {
        
    }

    // Piano tab
    const PianoTab = () => {
        return (
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginVertical: 16,
                    minHeight: 100, // Ensures consistent height
                }}
            >
                <TouchableOpacity
                    onPress={() => {
                        if (pianoAudioPlayer.current) {
                            if(pianoAudioPlayer.current.playing) {
                                pianoAudioPlayer.current.pause();
                                setIsPianoPlaying(false);
                            } else {
                                pianoAudioPlayer.current.play();
                                setIsPianoPlaying(true);
                            }
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
                <View style={{ width: '70%', paddingHorizontal: 0 }}>
                    <Slider
                        value={Math.round(currentTime * 100)}
                        minimumValue={0}
                        maximumValue={Math.round(duration * 100)}
                        step={1}
                        onValueChange={(value: number) => {
                            console.log('duration', duration * 100);
                            console.log('value', value);
                            pianoAudioPlayer.current?.pause();
                            setIsPianoPlaying(false);
                            
                            pianoAudioPlayer.current?.seekTo(value / 100);
                        }}
                        minimumTrackTintColor={Colors[theme].tint}
                        maximumTrackTintColor={Colors[theme].border}
                        style={{ width: '100%' }}
                    />
                </View>
            </View>
        )
    };

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
                        <Text style={{ fontSize: 18, color: Colors[theme].text, marginBottom: 8 }}>
                            {songData[params.number].title}
                        </Text>
                        {songData[params.number] && (
                            <Text style={{ fontSize: 16, color: Colors[theme].text }}>
                                Author: none
                            </Text>
                        )}
                        {songData[params.number] && (
                            <Text style={{ fontSize: 14, color: Colors[theme].text, marginTop: 4 }}>
                                © 2024
                            </Text>
                        )}
                    </>
                ) : (
                    <Text style={{ color: Colors[theme].text }}>No details available.</Text>
                )}
            </View>
        )
    }

    return (
        <>
            {imageData ? (
                <ScrollView
                    minimumZoomScale={1}
                    maximumZoomScale={5}
                    contentContainerStyle={{ flexGrow: 1 }}
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
        </>
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
            backgroundColor: 'grey',
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