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
    Platform,
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import {
    BottomSheetModal,
    BottomSheetModalProvider,
    BottomSheetView,
} from '@expo/ui/community/bottom-sheet';
import SegmentedControl from '@expo/ui/community/segmented-control';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import Ionicons from '@react-native-vector-icons/ionicons';
import TrackPlayer, { useIsPlaying, useProgress } from '@rntp/player';
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import NoteButton from '@/components/NoteButton';
import StyledText from '@/components/StyledText';
import { getNoteMp3, Note, notePngs } from '@/constants/assets';
import { Colors } from '@/constants/Colors';
import { isIOS26DesignEnabled } from '@/constants/iosDesign';
import { useI18n } from '@/hooks/useI18n';

const MUSIC_SHEET_BASE_HEIGHT = 280;
const NOTE_PLAYER_OPTIONS = { keepAudioSessionActive: true } as const;
const NOTE_PLAY_DELAY_MS = 200;

export type DisplayMusicSheetHandle = {
    present: () => void;
    dismiss: () => void;
    toggle: () => void;
};

type DisplayMusicSheetProps = {
    theme: 'light' | 'dark';
    songNotes: string[];
    hasPiano: boolean;
    isHorizontal: boolean;
    selectedIndex: number;
    onSelectedIndexChange: (index: number) => void;
    onOpenChange?: (open: boolean) => void;
};

function formatTime(currentTime: number) {
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export const DisplayMusicSheet = forwardRef<DisplayMusicSheetHandle, DisplayMusicSheetProps>(
    function DisplayMusicSheet(
        {
            theme,
            songNotes,
            hasPiano,
            isHorizontal,
            selectedIndex,
            onSelectedIndexChange,
            onOpenChange,
        },
        ref,
    ) {
        const i18n = useI18n();
        const { height: windowHeight, width: windowWidth } = useWindowDimensions();
        const isAndroidLandscape = Platform.OS === 'android' && windowWidth > windowHeight;
        const ios26DesignEnabled = isIOS26DesignEnabled();
        const isLiquidGlass = ios26DesignEnabled
            && isLiquidGlassAvailable()
            && isGlassEffectAPIAvailable();
        const useSwiftUIBottomSheetPadding = ios26DesignEnabled;
        const styles = useMemo(
            () => makeStyles(theme, useSwiftUIBottomSheetPadding),
            [theme, useSwiftUIBottomSheetPadding],
        );

        const bottomSheetModalRef = useRef<BottomSheetModal>(null);
        const isModalOpenRef = useRef(false);
        const [musicSheetOpen, setMusicSheetOpen] = useState(false);
        const audioPlayers = useRef<AudioPlayer[]>([]);

        const progress = useProgress(hasPiano ? 0.25 : 1);
        const isPianoPlaying = useIsPlaying();
        const [pianoSeekOverride, setPianoSeekOverride] = useState<number | null>(null);
        const pianoSeekReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        const pianoDuration = progress.duration > 0 ? progress.duration : 0;
        const pianoPosition = pianoSeekOverride ?? progress.position;
        const canSeekPiano = pianoDuration > 0;

        const musicSheetSnapPoints = useMemo(() => {
            if (Platform.OS !== 'android') {
                return [Math.min(MUSIC_SHEET_BASE_HEIGHT, Math.floor(windowHeight * 0.25))];
            }
            return isAndroidLandscape ? ['100%'] : ['0%', '50%'];
        }, [windowHeight, isAndroidLandscape]);

        const sheetCloseButtonPosition = useMemo(() => {
            if (!isHorizontal) {
                return { top: 0, right: 16 };
            }
            if (Platform.OS === 'android') {
                return { top: -4, right: 16 };
            }
            return { top: 0, right: 0 };
        }, [isHorizontal]);

        useImperativeHandle(ref, () => ({
            present: () => bottomSheetModalRef.current?.present(),
            dismiss: () => bottomSheetModalRef.current?.dismiss(),
            toggle: () => {
                if (!bottomSheetModalRef.current) return;
                if (isModalOpenRef.current) {
                    bottomSheetModalRef.current.dismiss();
                } else {
                    bottomSheetModalRef.current.present();
                }
            },
        }), []);

        const handleSheetChanges = useCallback((index: number) => {
            const open = index >= 0;
            isModalOpenRef.current = open;
            setMusicSheetOpen(open);
            onOpenChange?.(open);
        }, [onOpenChange]);

        const prevAndroidLandscapeRef = useRef(isAndroidLandscape);
        useEffect(() => {
            const prev = prevAndroidLandscapeRef.current;
            prevAndroidLandscapeRef.current = isAndroidLandscape;
            if (Platform.OS !== 'android' || prev === isAndroidLandscape || !musicSheetOpen) {
                return;
            }
            requestAnimationFrame(() => {
                bottomSheetModalRef.current?.present();
            });
        }, [isAndroidLandscape, musicSheetOpen]);

        const clearPianoSeekOverride = useCallback(() => {
            if (pianoSeekReleaseTimeoutRef.current) {
                clearTimeout(pianoSeekReleaseTimeoutRef.current);
                pianoSeekReleaseTimeoutRef.current = null;
            }
            setPianoSeekOverride(null);
        }, []);

        useEffect(() => {
            if (pianoSeekOverride === null) {
                return;
            }
            if (Math.abs(progress.position - pianoSeekOverride) <= 1) {
                clearPianoSeekOverride();
            }
        }, [clearPianoSeekOverride, pianoSeekOverride, progress.position]);

        useEffect(() => {
            clearPianoSeekOverride();
        }, [songNotes, clearPianoSeekOverride]);

        useEffect(() => {
            let cancelled = false;
            const players: AudioPlayer[] = [];

            (async () => {
                for (const note of songNotes) {
                    if (cancelled) return;
                    const assetId = getNoteMp3(note);
                    const player = createAudioPlayer(assetId, NOTE_PLAYER_OPTIONS);
                    players.push(player);
                    if (players.length % 5 === 0) {
                        await new Promise((resolve) => setTimeout(resolve, 0));
                    }
                }
                if (!cancelled) {
                    audioPlayers.current = players;
                } else {
                    players.forEach((player) => player.release());
                }
            })();

            return () => {
                cancelled = true;
                players.forEach((player) => player.release());
                audioPlayers.current = [];
            };
        }, [songNotes]);

        function getClef(note: string) {
            const modifiedNote = note.replace('#', '').replace('b', '');
            if (songNotes.indexOf(note) > 1 || !Object.keys(notePngs).includes(modifiedNote)) {
                return 'treble';
            }
            return 'bass';
        }

        function playNote(note: string) {
            const id = songNotes.indexOf(note);
            if (id < 0) return;
            const player = audioPlayers.current[id];
            if (!player) return;
            try {
                if (!player.isLoaded) return;
                player.seekTo(0);
                player.play();
            } catch {
                player.release();
                audioPlayers.current[id] = createAudioPlayer(getNoteMp3(note), NOTE_PLAYER_OPTIONS);
                audioPlayers.current[id].play();
            }
        }

        async function playAllNotes() {
            for (let index = 0; index < songNotes.length; index++) {
                playNote(songNotes[index]);
                await new Promise((resolve) => setTimeout(resolve, NOTE_PLAY_DELAY_MS));
            }
        }

        return (
            <BottomSheetModalProvider>
                <BottomSheetModal
                    ref={bottomSheetModalRef}
                    key={isAndroidLandscape ? 'landscape' : 'portrait'}
                    onChange={handleSheetChanges}
                    style={isLiquidGlass ? undefined : styles.bottomSheet}
                    backgroundStyle={isLiquidGlass ? undefined : styles.bottomSheet}
                    handleComponent={isAndroidLandscape ? null : undefined}
                    handleIndicatorStyle={styles.handleIndicator}
                    enablePanDownToClose={!isAndroidLandscape}
                    enableContentPanningGesture={false}
                    enableDynamicSizing={false}
                    snapPoints={musicSheetSnapPoints}
                >
                    <BottomSheetView style={styles.contentContainer}>
                        {isHorizontal ? (
                            <View
                                style={[styles.sheetCloseButtonContainer, sheetCloseButtonPosition]}
                                pointerEvents="box-none"
                            >
                                <TouchableOpacity
                                    onPress={() => bottomSheetModalRef.current?.dismiss()}
                                    activeOpacity={0.9}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                >
                                    <Ionicons name="close" size={22} color={Colors[theme].icon} />
                                </TouchableOpacity>
                            </View>
                        ) : null}
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
                                    onSelectedIndexChange(event.nativeEvent.selectedSegmentIndex);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            />
                            {selectedIndex === 0 ? (
                                <View style={styles.notesTab}>
                                    <View style={styles.noteButton}>
                                        <NoteButton
                                            note={'' as Note}
                                            clef="none"
                                            onClick={() => playAllNotes()}
                                        />
                                        <StyledText style={{ fontSize: 18, color: Colors[theme].text }}>
                                            {i18n.t('all')}
                                        </StyledText>
                                    </View>
                                    {songNotes.map((note, index) => (
                                        <View key={index} style={styles.noteButton}>
                                            <NoteButton
                                                note={note as Note}
                                                clef={getClef(note)}
                                                onClick={() => playNote(note)}
                                            />
                                            <StyledText style={{ fontSize: 18, color: Colors[theme].text }}>
                                                {note}
                                            </StyledText>
                                        </View>
                                    ))}
                                </View>
                            ) : null}
                            {selectedIndex === 1 ? (
                                <View style={styles.pianoTab}>
                                    <TouchableOpacity
                                        style={{ marginTop: 8 }}
                                        onPress={async () => {
                                            const isPlaying = await TrackPlayer.isPlaying();
                                            if (isPlaying) {
                                                TrackPlayer.pause();
                                            } else {
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
                                            color={Colors[theme].text}
                                        />
                                    </TouchableOpacity>
                                    <View style={styles.sliderRow}>
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
                            ) : null}
                        </View>
                    </BottomSheetView>
                </BottomSheetModal>
            </BottomSheetModalProvider>
        );
    },
);

function makeStyles(theme: 'light' | 'dark', useSwiftUIBottomSheetPadding: boolean) {
    return StyleSheet.create({
        noteButton: {
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
        },
        handleIndicator: {
            backgroundColor: Colors[theme].border,
        },
        contentContainer: {
            paddingBottom: 50,
            overflow: 'visible',
        },
        sheetContent: {
            paddingTop: useSwiftUIBottomSheetPadding ? 24 : 8,
            paddingHorizontal: 8,
            alignItems: 'center',
        },
        sheetCloseButtonContainer: {
            position: 'absolute',
            zIndex: 1,
        },
        bottomSheet: {
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 7,
            },
            shadowOpacity: 0.43,
            shadowRadius: 9.51,
            elevation: 15,
            backgroundColor: Colors[theme].settingsButton,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
        },
        notesTab: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginVertical: 16,
            minHeight: 110,
        },
        pianoTab: {
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginVertical: 16,
            minHeight: 110,
        },
        sliderRow: {
            width: 350,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 0,
        },
    });
}
