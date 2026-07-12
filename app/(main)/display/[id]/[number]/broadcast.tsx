import { Colors } from '@/constants/Colors';
import { Alert, Keyboard, Text, StyleSheet, View, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useContext, useState } from 'react';
import { HymnalContext } from '@/constants/context';
import Ionicons from '@react-native-vector-icons/ionicons'
import { Pressable, TextInput } from 'react-native-gesture-handler';
import { canPublishBroadcast, publishFromContext } from '@/scripts/broadcastPublish';
import { createSongCommand } from '@/scripts/displayCommand';
import { findSongNumberInList } from '@/scripts/ecampDisplay';
import { getSongData } from '@/scripts/hymnals';
import { useBookData } from '@/hooks/useBookData';
import { useColorScheme } from '@/hooks/useColorScheme';
import { isIOS26DesignEnabled } from '@/constants/iosDesign';
import StyledText from '@/components/StyledText';
import { useI18n } from '@/hooks/useI18n';

const VERSE_GRID_COLUMNS = 8;
const VERSE_GRID_COLUMNS_PORTRAIT = 5;

export default function BroadcastPanel() {

    const params = useLocalSearchParams<{ id: string, number: string }>();
    const theme = useColorScheme() ?? 'light';
    const { width, height } = useWindowDimensions();
    const isHorizontal = width > height;
    const styles = makeStyles(theme as any, isHorizontal);
    const router = useRouter();
    const context = useContext(HymnalContext);
    const book = useBookData(params.id, context);
    const isLiquidGlass = isIOS26DesignEnabled();
    const i18n = useI18n();

    const [songInput, setSongInput] = useState('');
    const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

    async function broadcast_song_number() {
        if (!book || !canPublishBroadcast(context)) {
            return;
        }

        let number = params.number;
        if (songInput.length > 0) {
            const songData = await getSongData(book.name.short);
            const matchedNumber = findSongNumberInList(songData ?? {}, songInput);
            if (!matchedNumber) {
                Alert.alert(i18n.t('broadcastSongNotFound'), i18n.t('broadcastSongNotFoundMessage'));
                return;
            }
            number = matchedNumber;
        }

        await publishFromContext(
            context,
            createSongCommand({
                number,
                bookMedium: book.name?.medium || '',
                verses: selectedVerses,
                bookColor: book.primaryColor || '#000000',
            }),
            i18n,
        );
        router.back();
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
                backgroundColor: isLiquidGlass ? 'transparent' : Colors[theme]['background'],
            }}>
                {isHorizontal && (
                    <View style={styles.sheetCloseButtonContainer} pointerEvents="box-none">
                        <TouchableOpacity
                            style={styles.sheetCloseButton}
                            onPress={() => router.back()}
                            activeOpacity={0.9}
                            hitSlop={8}
                        >
                            <Ionicons name="close" size={22} color={Colors[theme].icon} />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.songInputContainer}>
                    <TextInput
                        placeholder={params.number || '#'}
                        placeholderTextColor={Colors[theme]['fadedText']}
                        keyboardType="numeric"
                        maxLength={3}
                        style={styles.songInput}
                        onChangeText={text => {
                            const numericText = text.replace(/[^0-9]/g, '');
                            setSongInput(numericText);
                        }}
                        value={songInput}
                    />
                </View>
                <Pressable
                    key="all"
                    style={[styles.verseBubble, styles.topVerseBubble, selectedVerses[0] === -2 && styles.selectedVerseBubble]}
                    onPress={() => {
                        Keyboard.dismiss();
                        if (selectedVerses[0] === -2) {
                            setSelectedVerses([]);
                        } else {
                            setSelectedVerses([-2]);
                        }
                    }}
                >
                    <Text style={styles.verseText}>
                        All Verses
                    </Text>
                </Pressable>
                <View style={styles.verseGrid}>
                    {Array.from({ length: 15 }, (_, i) => (
                        <Pressable
                            key={i + 1}
                            style={[styles.verseBubble, selectedVerses.includes(i + 1) && styles.selectedVerseBubble]}
                            onPress={() => {
                                Keyboard.dismiss();
                                let verses = selectedVerses;
                                if (verses[0] === -2) {
                                    verses = [];
                                }

                                if (verses.includes(i + 1)) {
                                    setSelectedVerses(verses.filter(x => x !== i + 1));
                                } else {
                                    setSelectedVerses([...verses, i + 1]);
                                }
                            }}
                        >
                            <Text style={styles.verseNumberText}>{i + 1}</Text>
                        </Pressable>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.sendButton, isHorizontal && styles.sendButtonHorizontal]}
                    onPress={() => {
                        Keyboard.dismiss();
                        broadcast_song_number();
                    }}
                >
                    <Ionicons
                        name='send'
                        size={18}
                        color='white'
                    />
                    <StyledText style={styles.actionButtonLabel}>{i18n.t('send')}</StyledText>
                </TouchableOpacity>
            </View>
        </TouchableWithoutFeedback>
    );
}

function makeStyles(theme: "light" | "dark", isHorizontal: boolean) {
    const verseSize = isHorizontal ? 48 : 56;
    const verseMargin = isHorizontal ? 4 : 8;
    const verseGridColumns = isHorizontal ? VERSE_GRID_COLUMNS : VERSE_GRID_COLUMNS_PORTRAIT;

    return StyleSheet.create({
        actionButtonLabel:{
            color: 'white',
            fontSize: 16,
            fontWeight: '600',
            fontFamily: 'Lato',
        },
        sheetCloseButtonContainer: {
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1,
        },
        sheetCloseButton: {
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
        },
        sendButton: {
            backgroundColor: Colors[theme]['primary'],
            padding: 15,
            margin: 40,
            borderRadius: 15,
            justifyContent: 'center',
            alignItems: 'center',
            width: '25%',
            flexDirection: 'row',
            gap: 8,
        },
        sendButtonHorizontal: {
            margin: 16,
        },
        songInputContainer: {
            width: '25%',
            marginTop: isHorizontal ? 8 : 16,
        },
        songInput: {
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            fontSize: 18,
            color: Colors[theme]['text'],
            textAlign: 'center',
        },
        verseGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            width: verseGridColumns * (verseSize + verseMargin * 2),
            justifyContent: 'center',
        },
        verseBubble: {
            width: verseSize,
            height: verseSize,
            margin: verseMargin,
            borderRadius: verseSize / 2,
            backgroundColor: Colors[theme]['settingsButton'],
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: Colors[theme]['settingsButton'],
            overflow: 'hidden',
        },
        topVerseBubble: {
            width: isHorizontal ? 112 : 128,
            marginTop: isHorizontal ? 8 : 24,
        },
        selectedVerseBubble: {
            borderColor: Colors[theme]['primary'],
        },
        verseText: {
            color: Colors[theme]['text'],
            fontSize: 16,
        },
        verseNumberText: {
            color: Colors[theme]['text'],
            fontSize: 20,
        },
        destructiveSettingsText: {
            fontSize: 18,
            fontWeight: '400',
            color: Colors[theme].destructive,
            fontFamily: 'Lato',
        },
        settingsLabel: {
            fontSize: 14,
            fontWeight: '400',
            color: Colors[theme]['fadedText'],
            fontFamily: 'Lato',
            marginLeft: 20,
            marginVertical: 8,
        },
        settingsContainer: {
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 12,
            overflow: 'hidden',
        },
        settingsItem: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 14,

        },
        settingsText: {
            fontSize: 18,
            fontWeight: '400',
            color: Colors[theme]['text'],
            fontFamily: 'Lato',
        },

        scrollView: {
            flex: 1,
            width: '100%',
            paddingTop: 140,
            paddingBottom: 15,
        },
        button: {
            paddingVertical: 20,
            borderRadius: 16,
            marginBottom: 15,
            paddingHorizontal: 20,
            justifyContent: 'center',
        },
        buttonText: {
            color: 'white',
            fontSize: 24,
            fontWeight: '700',
            fontFamily: 'Lato',
            textAlign: 'center'
        },
        screenContainer: {
            flex: 1, // Ensures the container takes up the full screen
            backgroundColor: Colors[theme]['background'] // Dynamically set background color using useThemeColor
        },
        titleContainer: {
            marginTop: 80,
            marginBottom: 20,
            marginLeft: 10,
        },
        stepContainer: {
            gap: 8,
            marginBottom: 8
        },
        reactLogo: {
            height: 178,
            width: 290,
            bottom: 0,
            left: 0,
            position: 'absolute'
        },
        textStyle: {
            fontSize: 32,
            fontWeight: '500',
            color: Colors[theme]['text'], // Dynamically set text color using useThemeColor
            fontFamily: 'Lato'
        },
    });

};