import { Colors } from '@/constants/Colors';
import { Text, StyleSheet, SafeAreaView, ScrollView, View, TouchableHighlight, ListRenderItemInfo, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { router, useNavigation, useRouter } from 'expo-router';
import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { Divider } from 'react-native-elements';
import Constants from 'expo-constants';
import { HymnalContext } from '@/constants/context';
import { useI18n } from '@/hooks/useI18n';
import { useColorScheme } from '@/hooks/useColorScheme';
import StyledText from '@/components/StyledText';
import Ionicons from '@react-native-vector-icons/ionicons'
import axios from 'axios';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { FlatList, Pressable, TextInput } from 'react-native-gesture-handler';
import { BookSummary } from '@/constants/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { request_client, set } from '@/scripts/broadcast';
import { isIOS26DesignDisabled } from '@/constants/iosDesign';
import { getKeypadGridWidth } from '@/scripts/keypadGrid';

const BROADCAST_VERSE_COLUMNS = 4;
const BROADCAST_VERSE_SIZE = 56;
const BROADCAST_VERSE_MARGIN = 8;
const BROADCAST_VERSE_GRID_WIDTH = getKeypadGridWidth(
    BROADCAST_VERSE_COLUMNS,
    BROADCAST_VERSE_SIZE,
    BROADCAST_VERSE_MARGIN,
);

function parseStoredOrder(raw: string | null): string[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
            return [];
        }
        return [...new Set(parsed)];
    } catch {
        return [];
    }
}

function reconcileOrder(savedOrder: string[], currentKeys: string[]): string[] {
    const currentKeySet = new Set(currentKeys);
    const normalizedSaved = [...new Set(savedOrder)].filter((key) => currentKeySet.has(key));
    const missingKeys = currentKeys.filter((key) => !normalizedSaved.includes(key));
    return [...normalizedSaved, ...missingKeys];
}

export default function BroadcastOptionsScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);
    const navigation = useNavigation();
    useLayoutEffect(() => {
        if (isIOS26DesignDisabled()) {

            navigation.setOptions({
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
                ]
            });
        }
    }, []);
    const context = useContext(HymnalContext);

    const i18n = useI18n();

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
            const bookKeys = Object.keys(context?.BOOK_DATA ?? {});
            setSortOrder(reconcileOrder(parseStoredOrder(order), bookKeys));
        } catch (error) {
            console.error("Error loading sort order:", error);
            setSortOrder(Object.keys(context?.BOOK_DATA ?? {}));
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

    async function clearScreen() {
        if (!context?.broadcastingChurch) {
            return;
        }

        await set(request_client(), context.broadcastingChurch, "", "", [-1], "");
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
            <View style={{ flex: 1, backgroundColor: Colors[theme]['background'] }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        backgroundColor: Colors[theme]['background'],
                        width: '100%',
                        paddingBottom: 15,
                    }}>
                    <View style={{ width: '100%' }}>
                    <FlatList
                        data={sortOrder}
                        renderItem={renderItem}
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                        style={{ flexGrow: 0 }}
                        ItemSeparatorComponent={() => <View style={{ width: 5 }} />}
                        contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'center' }}
                    />

                    <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 16 }}>
                        <View style={{ marginHorizontal: 20, width: '25%' }}>
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
                        <View style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            width: BROADCAST_VERSE_GRID_WIDTH,
                            alignSelf: 'center',
                        }}>
                            {Array.from({ length: 12 }, (_, i) => (
                                <Pressable
                                    key={i + 1}
                                    style={{
                                        width: BROADCAST_VERSE_SIZE,
                                        height: BROADCAST_VERSE_SIZE,
                                        margin: BROADCAST_VERSE_MARGIN,
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

                        <View style={styles.actionButtonRow}>
                            <TouchableOpacity
                                style={styles.actionButton}
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
                                <StyledText style={styles.actionButtonLabel}>{i18n.t('send')}</StyledText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={clearScreen}
                            >
                                <Ionicons
                                    name='trash-outline'
                                    size={18}
                                    color='white'
                                />
                                <StyledText style={styles.actionButtonLabel}>{i18n.t('clearScreen')}</StyledText>
                            </TouchableOpacity>
                        </View>
                    </View>
                    </View>
                </KeyboardAvoidingView >
            </TouchableWithoutFeedback>
            </View>
        </>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        actionButtonRow: {
            flexDirection: 'column',
            gap: 12,
            marginTop: 40,
            alignItems: 'center',
            width: '100%',
        },
        clearButton: {
            backgroundColor: Colors[theme].destructive,
            paddingVertical: 15,
            paddingHorizontal: 24,
            borderRadius: 15,
            flexDirection: 'row',
            gap: 8,
            justifyContent: 'center',
            alignItems: 'center',
        },
        actionButton: {
            backgroundColor: Colors[theme]['primary'],
            paddingVertical: 15,
            paddingHorizontal: 24,
            borderRadius: 15,
            flexDirection: 'row',
            gap: 8,
            justifyContent: 'center',
            alignItems: 'center',
        },
        actionButtonLabel: {
            color: 'white',
            fontSize: 16,
            fontWeight: '600',
            fontFamily: 'Lato',
        },
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