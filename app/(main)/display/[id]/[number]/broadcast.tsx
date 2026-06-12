import { Colors } from '@/constants/Colors';
import { Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useContext, useState } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { HymnalContext } from '@/constants/context';
import Ionicons from '@react-native-vector-icons/ionicons'
import { Pressable } from 'react-native-gesture-handler';
import { request_client, set } from '@/scripts/broadcast';
import { useBookData } from '@/hooks/useBookData';
import { useColorScheme } from '@/hooks/useColorScheme';
import { isIOS26DesignEnabled } from '@/constants/iosDesign';

export default function BroadcastPanel() {

    const params = useLocalSearchParams<{ id: string, number: string }>();
    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);
    const router = useRouter();
    const context = useContext(HymnalContext);
    const book = useBookData(params.id, context);
    const isLiquidGlass = isIOS26DesignEnabled();

    const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

    useFocusEffect(
        useCallback(() => {
            void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            return () => {
                void ScreenOrientation.unlockAsync();
            };
        }, []),
    );

    async function broadcast_song_number() {
        if (!book)
            return book;

        if (!context?.broadcastingChurch)
            return;

        await set(request_client(), context?.broadcastingChurch, params.number, book.name?.medium || "", selectedVerses, book.primaryColor || "#000000");
        router.back();
    };

    return (

        <View style={{
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            backgroundColor: isLiquidGlass ? 'transparent' : Colors[theme]['background'],
        }}>
            <Pressable
                key="all"
                style={[styles.verseBubble, styles.topVerseBubble, selectedVerses[0] === -2 && styles.selectedVerseBubble]}
                onPress={() => {
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                {Array.from({ length: 15 }, (_, i) => (
                    <Pressable
                        key={i + 1}
                        style={[styles.verseBubble, selectedVerses.includes(i + 1) && styles.selectedVerseBubble]}
                        onPress={() => {
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
                style={styles.sendButton}
                onPress={() => {
                    broadcast_song_number();
                }}
            >
                <Ionicons
                    name='send'
                    size={18}
                    color='white'
                />
            </TouchableOpacity>
        </View>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        sendButton: {
            backgroundColor: Colors[theme]['primary'],
            padding: 15,
            margin: 40,
            borderRadius: 15,
            justifyContent: 'center',
            alignItems: 'center',
            width: '25%'
        },
        verseBubble: {
            width: 56,
            height: 56,
            margin: 8,
            borderRadius: 28,
            backgroundColor: Colors[theme]['settingsButton'],
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: Colors[theme]['settingsButton'],
            overflow: 'hidden',
        },
        topVerseBubble: {
            width: 128,
            marginTop: 24,
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
            marginLeft: '5%',
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
            paddingHorizontal: '5%',
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
            paddingTop: 125,
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