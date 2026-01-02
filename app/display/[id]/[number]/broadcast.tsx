import { Colors } from '@/constants/Colors';
import { Text, StyleSheet, SafeAreaView, ScrollView, View, useColorScheme, TouchableHighlight, ListRenderItemInfo, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Divider } from 'react-native-elements';
import Constants from 'expo-constants';
import { HymnalContext } from '@/constants/context';
import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import { translations } from '@/constants/localization';
import StyledText from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { FlatList, Pressable, TextInput } from 'react-native-gesture-handler';
import { BookSummary } from '@/constants/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { request_client, set } from '@/scripts/broadcast';
import { useBookData } from '@/hooks/useBookData';

export default function BroadcastPanel() {

    const params = useLocalSearchParams<{ id: string, number: string }>();
    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);
    const router = useRouter();
    const context = useContext(HymnalContext);
    const book = useBookData(params.id, context);

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

    async function broadcast_song_number() {
        if (!book)
            return book;

        if(!context?.broadcastingChurch)
            return;

        await set(request_client(), context?.broadcastingChurch, params.number, book.name?.medium || "", selectedVerses, book.primaryColor || "#000000");
        router.back();
    };

    return (
        <>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView style={{
                    backgroundColor: Colors[theme]['background'],
                    width: '100%',
                    paddingTop: 125,
                    paddingBottom: 15,
                }}>

                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                        <Pressable
                            key="all"
                            style={{
                                width: 56,
                                height: 56,
                                margin: 8,
                                borderRadius: 28,
                                backgroundColor: Colors[theme]['settingsButton'],
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 2,
                                borderColor: selectedVerses[0] === -2 ? Colors[theme]['primary'] : Colors[theme]['background'],
                                marginTop: 24
                            }}
                            onPress={() => {
                                if (selectedVerses[0] === -2) {
                                    setSelectedVerses([]);
                                } else {
                                    setSelectedVerses([-2]);
                                }
                            }}
                        >
                            <Text style={{ color: Colors[theme]['text'], fontSize: 16 }}>
                                All
                            </Text>
                        </Pressable>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {Array.from({ length: 12 }, (_, i) => (
                                <Pressable
                                    key={i + 1}
                                    style={{
                                        width: 56,
                                        height: 56,
                                        margin: 8,
                                        borderRadius: 28,
                                        backgroundColor: Colors[theme]['settingsButton'],
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderWidth: 2,
                                        borderColor: selectedVerses.includes(i + 1) ? Colors[theme]['primary'] : Colors[theme]['background'],
                                    }}
                                    onPress={() => {
                                        let verses = selectedVerses;
                                        if (verses[0] == -2)
                                            verses = [];

                                        if (verses.includes(i + 1))
                                            setSelectedVerses(verses.filter(x => x != i + 1));
                                        else
                                            setSelectedVerses([...verses, i + 1])
                                    }}
                                >
                                    <Text style={{ color: Colors[theme]['text'], fontSize: 20 }}>{i + 1}</Text>
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
                </KeyboardAvoidingView >
            </TouchableWithoutFeedback>
        </>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        sendButton: {
            backgroundColor: Colors[theme]['primary'],
            padding: 15,
            marginTop: 40,
            borderRadius: 15,
            justifyContent: 'center',
            alignItems: 'center',
            width: '25%'
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
            fontWeight: 'bold',
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