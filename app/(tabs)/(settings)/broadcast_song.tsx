import { Colors } from '@/constants/Colors';
import { Text, StyleSheet, SafeAreaView, ScrollView, View, useColorScheme, TouchableHighlight, ListRenderItemInfo, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
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

export default function BroadcastOptionsScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);
    const router = useRouter();
    const context = useContext(HymnalContext);

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    const [bookData, setBookData] = useState<Record<string, BookSummary> | null>(null);

    const [sortOrder, setSortOrder] = useState<string[]>([]);
    const HYMNAL_SORT_KEY = 'hymnal_sort_order';
    const saveOrder = async (order: string[]) => {
        try {
            await AsyncStorage.setItem(HYMNAL_SORT_KEY, JSON.stringify(order));
        } catch (error) {
            console.error("Error saving sort order:", error);
        }
    };
    const loadOrder = async () => {
        try {
            const order = await AsyncStorage.getItem(HYMNAL_SORT_KEY);
            if (order !== null) {
                setSortOrder(JSON.parse(order));
            }
        } catch (error) {
            console.error("Error loading sort order:", error);
        }
    };

    useEffect(() => {
        if (!context)
            return;

        const loadInitialData = async () => {
            await loadOrder();
        };
        loadInitialData();

        const books = context.BOOK_DATA;
        setBookData(books);
    }, [context?.BOOK_DATA]);

    const [selectedHymnal, setSelectedHymnal] = useState<string>("");
    const [songInput, setSongInput] = useState<string>("");
    const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

    async function broadcast_song_number() {
        let book = bookData![selectedHymnal];
        if (!book)
            return book;

        if(!context?.broadcastingChurch)
            return;

        let number = songInput.replace(/^0+/, '');

        await set(request_client(), context?.broadcastingChurch, number, book.name?.medium || "", selectedVerses, book.primaryColor || "#000000");
    }

    const renderItem = ({ item }: ListRenderItemInfo<string>) => (
        <TouchableOpacity
            style={{
                backgroundColor: bookData![item].primaryColor,
                padding: 15,
                borderRadius: 15,
                borderWidth: 3,
                borderColor: selectedHymnal == item ? Colors[theme]['primary'] : 'rgba(0,0,0,0)',
                alignItems: 'center',
                justifyContent: 'center'
            }}
            onPress={() => {
                setSelectedHymnal(item);
            }}
        >
            <StyledText
                style={{
                    color: "white",
                    fontSize: 16
                }}
            >
                {bookData![item].name.medium}
            </StyledText>
        </TouchableOpacity>
    )
    return (
        <>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView style={{
                    backgroundColor: Colors[theme]['background'],
                    width: '100%',
                    paddingTop: 125,
                    paddingBottom: 15,
                }}>
                    <FlatList
                        data={sortOrder}
                        renderItem={renderItem}
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                        ItemSeparatorComponent={() => <View style={{ width: 5 }} />}
                        contentContainerStyle={{ paddingHorizontal: 20 }}
                    />

                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ marginTop: 20, marginHorizontal: 20, width: '25%' }}>
                            <TextInput
                                placeholder="#"
                                placeholderTextColor={Colors[theme]['fadedText']}
                                keyboardType="numeric"
                                style={{
                                    backgroundColor: Colors[theme]['settingsButton'],
                                    borderRadius: 12,
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    fontSize: 18,
                                    color: Colors[theme]['text'],
                                    textAlign: 'center'
                                }}
                                onChangeText={text => {
                                    // Only allow numbers
                                    const numericText = text.replace(/[^0-9]/g, '');
                                    setSongInput(numericText);
                                }}
                                value={songInput}
                            />
                        </View>

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
                                if(selectedHymnal.length < 1)
                                    return;
                                if(songInput.length < 1)
                                    return;

                                broadcast_song_number()
                            }}
                            disabled={selectedHymnal.length < 1 || songInput.length < 1}
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