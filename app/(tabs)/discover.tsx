import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { BookSummary, DiscoverMatch, DiscoverResult, DiscoverSongInfo, Song, SongList, SongSearchInfo } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import { router } from 'expo-router';
import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Text, StyleSheet, SafeAreaView, ScrollView, View, useColorScheme, Platform, ActivityIndicator, TouchableOpacity, Dimensions, Button, Alert, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { FlatList, Pressable, TextInput } from 'react-native-gesture-handler';
import SearchBar from 'react-native-platform-searchbar';
import { Divider } from 'react-native-elements'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchHistoryItem } from '@/components/SearchHistoryItem';
import React from 'react';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { translations } from '@/constants/localization';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModalProvider, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { Checkbox } from '@futurejj/react-native-checkbox';
import { set } from '@/scripts/broadcast';
import { LinearGradient } from 'expo-linear-gradient';
import StyledText from '@/components/StyledText';
import { fontFamily } from '@/constants/assets';
import GenericGradientButton from '@/components/GenericGradientButton';
import { ConicGradientRenderer } from '@/components/ConicGradient';
import Animated, { KeyboardState, useAnimatedKeyboard, useAnimatedStyle, useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

export default function DiscoverScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);

    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const context = useContext(HymnalContext);
    const [songList, setSongList] = useState<SongSearchInfo[]>([]);
    const [searchBarFocused, setSearchBarFocused] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    function stripSearchText(text: string) {
        return text
            .replace(/[.,/#!$%^&*;:{}=\-_'’"`~()]/g, "")
            .replace(/s{2,}/g, " ")
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "");
    }

    useLayoutEffect(() => {
        if (!context) return;

        const fetchData = async () => {
            try {
                let songList: SongSearchInfo[] = [];
                for (const id in context.BOOK_DATA) {
                    const songData = await getSongData(id);
                    Object.keys(songData).forEach((key: string) => {
                        const song: Song = songData[key];
                        const book: BookSummary = context.BOOK_DATA[id];
                        const searchInfo: SongSearchInfo = {
                            stripped_title: stripSearchText(song.title ?? ""),
                            stripped_first_line: stripSearchText(song.first_line ?? ""),
                            title: song.title,
                            first_line: song.first_line,
                            number: key,
                            book: book,
                        };
                        songList.push(searchInfo);
                    });
                }
                setSongList(songList);

                console.log("Loaded song data.");
            } catch (error) {
                console.error("Error loading song data:", error);
            } finally {
            }
        };

        fetchData();
    }, [context?.BOOK_DATA]);

    useFocusEffect(
        useCallback(() => {
            context?.setDiscoverPageVisited(true);
        }, [])
    );

    const scrollViewRef = useRef<FlatList>(null);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [dataSource, setDataSource] = useState<DiscoverSongInfo[]>([]);

    const supportedHymnals = ["ZH", "GH"];
    const promptSuggestions = [
        "God's Faithfulness",
        "Forgiveness and Grace",
        "The Holy Trinity",
        "Victory over Death"
    ];
    const [prompt, setPrompt] = useState("");
    const [latestPrompt, setLatestPrompt] = useState("");
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardWillShow', (e) => {
            Keyboard.scheduleLayoutAnimation(e);
            setKeyboardVisible(true);
            setKeyboardHeight(e.endCoordinates.height);
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardWillHide', (e) => {
            Keyboard.scheduleLayoutAnimation(e);
            setKeyboardVisible(false);
            setKeyboardHeight(0);
        });

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);
    const keyboard = useAnimatedKeyboard();
    const keyboardHeightStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: -keyboard.height.value }]
    }));

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

    const [selectedHymnals, setSelectedHymnals] = useState<string[]>([]);

    const ACCHYMNS_KEY = process.env.EXPO_PUBLIC_ACCHYMNS_KEY;
    async function sendPrompt(input: string) {
        if (input.trim().length === 0) {
            return;
        }
        setLoading(true);
        const data = await fetch('https://api.acchymns.app/discover', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-API-Key': ACCHYMNS_KEY ?? '',
            },
            body: JSON.stringify({
                prompt: input,
                hymnals: selectedHymnals.length > 0 ? selectedHymnals : ['all'],
                search_type: 'both',
                top_k: 10
            }),
        });
        setLoading(false);
        setPrompt('');
        setLatestPrompt(input);

        if (!data.ok) {
            console.error("Error sending prompt:", data.statusText);
            return;
        }

        const response = await data.json() as DiscoverResult;
        if (!response || !response.top_matches || response.top_matches.length === 0) {
            console.warn("No matches found for the prompt:", input);
            return;
        }

        if (context?.BOOK_DATA === undefined)
            return;
        const results: DiscoverSongInfo[] = response.top_matches.map((item: DiscoverMatch) => {
            const song = songList.find(s => s.book.name.short === item.hymnal_id && s.number === item.hymn_number);
            return {
                title: song?.title,
                number: song?.number,
                book: context?.BOOK_DATA[item.hymnal_id],
                type: item.type,
                verses: item.verses?.sort((a, b) => a.verse_number - b.verse_number)
            } as DiscoverSongInfo;
        });

        setDataSource(results);
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={{ flex: 1 }}>
                    <FlatList
                        ref={scrollViewRef}
                        scrollEnabled={scrollEnabled}
                        data={dataSource}
                        keyExtractor={(item, index) => item.book.name.short+item.number}
                        keyboardShouldPersistTaps='always'
                        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                        renderItem={({ item, index }: { item: DiscoverSongInfo, index: number }) => (
                            <View key={item.book.name.short+item.number}>
                                <GenericGradientButton
                                    primaryColor={item.book.primaryColor}
                                    secondaryColor={item.book.secondaryColor}
                                    onPress={() => {
                                        if (isNavigating) return;
                                        if (item.book.name.short && item.number) {
                                            router.push({ pathname: '/display/[id]/[number]', params: { id: item.book.name.short, number: item.number } });
                                        } else {
                                            console.error("Invalid item data: ", item);
                                        }
                                        setIsNavigating(true);
                                        setTimeout(() => setIsNavigating(false), 400); // or after navigation completes
                                    }}
                                    style={{
                                        marginHorizontal: 20,
                                        borderRadius: 12,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        minHeight: 84 // Ensure a minimum height of 60
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
                                        <View style={{ width: '80%', alignSelf: 'flex-start', gap: 4 }}>
                                            <StyledText numberOfLines={1} style={{ color: '#fff', fontSize: 20, fontWeight: 'medium', textAlign: 'left' }}>{item.title}</StyledText>
                                            <StyledText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'left' }}>{item.book.name.medium}</StyledText>
                                        </View>
                                        <View style={{ width: '20%', alignItems: 'flex-end', justifyContent: 'center' }}>
                                            <StyledText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'right' }}>#{item.number}</StyledText>
                                        </View>
                                    </View>
                                </GenericGradientButton>
                                {item.type == "VERSE" && (
                                    <>
                                        {item.verses?.map((verse, id) => (
                                            <View key={id}>
                                                <View style={{ flexDirection: 'row' }}>
                                                    <View>
                                                        {id > 0 && (
                                                            <View style={[styles.verseStraightRect, {height: 80}]} />
                                                        )}
                                                        <View style={styles.verseArrowRect} />
                                                    </View>
                                                    <StyledText style={[styles.verseText, { fontWeight: '700' }]}>
                                                        {`${verse.verse_number}    `}
                                                        <StyledText style={[styles.verseText, { fontWeight: '400' }]}>
                                                            {verse.verse_text}
                                                        </StyledText>
                                                    </StyledText>
                                                </View>
                                            </View>
                                        ))}
                                    </>
                                )}
                            </View>
                        )}
                        style={[styles.scrollView]}
                        ListFooterComponent={() => <View style={{ height: 200 }} />}
                        ListHeaderComponent={
                            <>
                                <View style={styles.titleContainer}>
                                    <StyledText style={styles.textStyle}>{i18n.t('discover')}</StyledText>
                                    {dataSource.length > 0 && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
                                            <StyledText style={styles.subtitleTextStyle}>{i18n.t('discoverSubtitle')}</StyledText>
                                            <StyledText style={styles.subtitleTextStyleBold} numberOfLines={1}>{`"${latestPrompt}"`}</StyledText>
                                        </View>
                                    )}
                                </View>
                            </>
                        }
                    />
                </View>
            </TouchableWithoutFeedback>
            <BottomTabBarHeightContext.Consumer>
                {(height) => (
                    <Animated.View style={[
                        { marginBottom: keyboardVisible ? 0 : height }
                    ]}>
                        <View style={[styles.footerContainer]}>
                            {(prompt.trim().length === 0 && dataSource.length == 0) && (
                                <FlatList
                                    data={promptSuggestions}
                                    horizontal={true}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 5 }}
                                    renderItem={({ item }) => (
                                        <Pressable
                                            style={styles.suggestionButton}
                                            onPress={() => {
                                                setPrompt(item);
                                            }}>
                                            <StyledText style={styles.suggestionButtonText}>{item}</StyledText>
                                        </Pressable>
                                    )}
                                    keyExtractor={(item, index) => index.toString()}
                                />
                            )}
                            <View style={{ position: "relative" }}>
                                <ConicGradientRenderer
                                    borderRadius={18}
                                    poke={3}
                                    colors={[Colors[theme]['settingsButton'], "#C95EFF", "#94ABFF", Colors[theme]['settingsButton']]}
                                    spinRate={loading ? 450 : 15}
                                    enabled={prompt.trim().length > 0 || loading}
                                >
                                    <View style={styles.promptBox}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons
                                                name="sparkles"
                                                size={18}
                                                color={Colors[theme]['fadedText']}
                                            />
                                            <TextInput
                                                style={styles.promptInput}
                                                onChangeText={setPrompt}
                                                value={prompt}
                                                placeholder={`${i18n.t('promptPlaceholder')}`}
                                                keyboardType='default'
                                            />
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <TouchableOpacity
                                                style={styles.promptButton}
                                                onPress={() => {
                                                    Keyboard.dismiss();
                                                    handlePress();
                                                }}
                                            >
                                                <Ionicons
                                                    name="filter"
                                                    size={24}
                                                    color={Colors[theme]['fadedText']}
                                                />
                                            </TouchableOpacity>
                                            {prompt.trim().length > 0 && !loading && (
                                                <TouchableOpacity
                                                    style={styles.promptButton}
                                                    onPress={() => {
                                                        Keyboard.dismiss();
                                                        sendPrompt(prompt);
                                                    }}
                                                >
                                                    <Ionicons
                                                        name="arrow-up"
                                                        size={24}
                                                        color={Colors[theme]['fadedText']}
                                                    />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                </ConicGradientRenderer>
                            </View>
                        </View>
                    </Animated.View>
                )}
            </BottomTabBarHeightContext.Consumer>
            <BottomSheetModal
                ref={bottomSheetModalRef}
                onChange={handleSheetChanges}
                style={styles.bottomSheet}
                backgroundStyle={styles.bottomSheet}
                handleIndicatorStyle={styles.handleIndicator}
            >
                <BottomSheetView style={styles.contentContainer}>
                    <View style={{ marginTop: -20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <View
                                style={styles.closeButton}
                            >
                                <Ionicons
                                    name="close"
                                    size={24}
                                    color={Colors[theme]['settingsButton']}
                                />
                            </View>
                            <StyledText
                                style={styles.bottomSheetHeaderText}>
                                {i18n.t('filters')}
                            </StyledText>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => {
                                    bottomSheetModalRef.current?.dismiss();
                                }}
                            >
                                <Ionicons
                                    name="close"
                                    size={24}
                                    color={Colors[theme]['fadedText']}
                                />
                            </TouchableOpacity>
                        </View>
                        <View style={{ marginLeft: 20, marginTop: 10 }}>
                            <Pressable
                                style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 5 }}
                                onPress={() => {
                                    setSelectedHymnals([]);
                                }}
                            >
                                <Checkbox
                                    status={selectedHymnals.length < 1 ? 'checked' : 'unchecked'}
                                    color={Colors[theme]['text']}
                                />
                                <StyledText style={styles.filterText}>{i18n.t('allHymnals')}</StyledText>
                            </Pressable>
                            {supportedHymnals.map((item) => (
                                <Pressable
                                    key={item}
                                    style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 5 }}
                                    onPress={() => {
                                        if (selectedHymnals.includes(item)) {
                                            setSelectedHymnals(selectedHymnals.filter(hymnal => hymnal !== item));
                                        } else {
                                            setSelectedHymnals([...selectedHymnals, item]);
                                        }
                                    }}
                                >
                                    <Checkbox
                                        status={selectedHymnals.includes(item) ? 'checked' : 'unchecked'}
                                        color={context?.BOOK_DATA[item]?.primaryColor || Colors[theme]['primary']}
                                        uncheckedColor={context?.BOOK_DATA[item]?.primaryColor || Colors[theme]['primary']}
                                    />
                                    <StyledText style={styles.filterText}>{context?.BOOK_DATA[item]?.name.medium || item}</StyledText>
                                </Pressable>
                            ))}
                            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: '50%', marginVertical: 20 }}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setSelectedHymnals([]);
                                    }}
                                    style={styles.resetButton}
                                >
                                    <StyledText style={styles.resetButtonText}>{i18n.t('reset')}</StyledText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        bottomSheetModalRef.current?.dismiss();
                                    }}
                                    style={styles.applyButton}
                                >
                                    <StyledText style={styles.applyButtonText}>{i18n.t('apply')}</StyledText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </BottomSheetView>
            </BottomSheetModal>
        </KeyboardAvoidingView>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        verseStraightRect: {
            position: 'absolute',
            marginLeft: 45,
            marginRight: 15,
            width: 30,
            transform: [{translateY: -80}],
            borderLeftWidth: 1,
            borderColor: Colors[theme]['fadedIcon'],
            zIndex: -1
        },
        verseArrowRect: {
            marginLeft: 45,
            marginRight: 15,
            width: 30,
            height: 30,
            borderLeftWidth: 1,
            borderBottomWidth: 1,
            borderBottomLeftRadius: 12,
            borderColor: Colors[theme]['fadedIcon']
        },
        footerContainer: {
            position: 'absolute',
            bottom: 0,
            width: '100%',
        },
        resetButtonText: {
            color: Colors[theme]['text'],
            fontSize: 16,
            textAlign: 'center',
        },
        applyButtonText: {
            color: 'white',
            fontSize: 16,
            textAlign: 'center',
        },
        resetButton: {
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 16,
            padding: 16,
            marginRight: 10,
        },
        applyButton: {
            backgroundColor: Colors[theme]['primary'],
            borderRadius: 16,
            padding: 16,
            marginRight: 10,
        },
        filterText: {
            color: Colors[theme]['text'],
            fontSize: 16,
            marginLeft: 10,
        },
        bottomSheetHeaderText: {
            color: Colors[theme]['text'],
            fontSize: 18,
            textAlign: 'center',
        },
        handleIndicator: {
            backgroundColor: Colors[theme]['border'],
            height: 0
        },
        contentContainer: {
            flex: 1,
            padding: 8,
            paddingBottom: 20,
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
        },
        closeButton: {
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 32,
            padding: 8,
        },
        promptButton: {
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 32,
            padding: 15,
            shadowColor: Colors[theme]['text'],
            shadowRadius: 2,
            shadowOpacity: 0.3,
            shadowOffset: {
                width: 0,
                height: 0,
            },
        },
        promptBox: {
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingBottom: 20,
            marginHorizontal: 15,
            marginBottom: 20,
            shadowColor: Colors[theme]['text'],
            shadowRadius: 4,
            shadowOpacity: 0.1,
            shadowOffset: {
                width: 0,
                height: 0,
            },
        },
        suggestionButtonText: {
            color: Colors[theme]['fadedText'],
            fontSize: 16,
            textAlign: 'center'
        },
        suggestionButton: {
            backgroundColor: Colors[theme]['settingsButton'],
            padding: 10,
            borderRadius: 8,
            margin: 5,
            height: 40,
            justifyContent: 'center',
            shadowColor: Colors[theme]['text'],
            shadowRadius: 2,
            shadowOpacity: 0.1,
            shadowOffset: {
                width: 0,
                height: 0,
            },
        },
        promptInput: {
            height: 40,
            borderColor: Colors[theme]['text'],
            margin: 12,
            paddingLeft: 10,
            color: Colors[theme]['text'],
            width: '100%',
            fontSize: 16,
            fontFamily: fontFamily.regular,
            maxWidth: '90%'
        },
        searchHistoryTitle: {
            fontSize: 18,
            fontWeight: 'medium',
            color: Colors[theme]['fadedText'],
        },
        searchHistoryHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        searchHistoryContainer: {
            backgroundColor: Colors[theme]['background'],
            borderRadius: 16,
            paddingHorizontal: 20
        },
        searchBar: {
            marginHorizontal: 20,
            marginBottom: 20
        },
        searchBarContainer: {
            backgroundColor: Colors[theme].searchBarBackground,
            color: Colors[theme].text,
            fontSize: 18,
            height: 38,
        },
        rowItem: {
            height: 100,
            width: 100,
            alignItems: "center",
            justifyContent: "center",
        },
        headerText: {
            color: Colors[theme]['text'],
            fontWeight: "bold",
            fontSize: 24,
        },
        text: {
            color: "black",
            fontSize: 24,
            fontWeight: "bold",
            textAlign: "center",
        },
        scrollView: {
            paddingTop: 15,
            paddingBottom: 15,
            backgroundColor: Colors[theme].background
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
            fontFamily: 'Lato'
        },
        screenContainer: {
            flex: 1, // Ensures the container takes up the full screen
            backgroundColor: Colors[theme].background // Dynamically set background color using useThemeColor
        },
        titleContainer: {
            marginTop: 80,
            marginBottom: 10,
            marginLeft: 30,
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
        },
        subtitleTextStyle: {
            fontSize: 18,
            color: Colors[theme]['text']
        },
        subtitleTextStyleBold: {
            fontSize: 18,
            fontWeight: '500',
            color: Colors[theme]['text'],
            maxWidth: '60%'
        },
        fadedText: {
            fontSize: 24,
            fontWeight: '500',
            color: Colors[theme]['fadedText'], // Dynamically set text color using useThemeColor
        },
        descriptionText: {
            fontSize: 16,
            fontWeight: '400',
            color: Colors[theme]['fadedText'], // Dynamically set text color using useThemeColor
            textAlign: 'center'
        },
        verseText: {
            marginTop: 8,
            maxWidth: '70%',
            fontSize: 12,
            color: Colors[theme]['fadedText'],
        }
    });

};