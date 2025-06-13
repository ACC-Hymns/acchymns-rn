import React from 'react';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { Bookmark, BookSummary, Song, SongList, SongSearchInfo } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Text, StyleSheet, SafeAreaView, ScrollView, View, useColorScheme, Platform, ActivityIndicator, TouchableOpacity, Dimensions, Button, Alert } from 'react-native';
import { FlatList, TextInput } from 'react-native-gesture-handler';
import SearchBar from 'react-native-platform-searchbar';
import { Divider } from 'react-native-elements'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchHistoryItem } from '@/components/SearchHistoryItem';
import DefaultPreference from 'react-native-default-preference';
import SwipeableItem, { SwipeableItemImperativeRef, useSwipeableItemParams } from 'react-native-swipeable-item';
import { store } from 'expo-router/build/global-state/router-store';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { padStart } from 'pdf-lib';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { translations } from '@/constants/localization';

export default function BookmarkScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);

    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const context = useContext(HymnalContext);
    const [songList, setSongList] = useState<SongSearchInfo[]>([]);
    const [searchBarFocused, setSearchBarFocused] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';
    

    function stripSearchText(text: string) {
        return text
            .replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "")
            .replace(/s{2,}/g, " ")
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "");
    }
    const BOOKMARKS_KEY = 'bookmarks';
    const saveBookmarks = async (searches: Bookmark[]) => {
        try {
            await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(searches));
        } catch (error) {
            console.error("Error saving bookmarks:", error);
        }
    };
    const loadBookmarks = async () => {
        try {
            const storedBookmarks = await AsyncStorage.getItem(BOOKMARKS_KEY);
            if (storedBookmarks !== null) {
                const parsedBookmarks = JSON.parse(storedBookmarks) as Bookmark[];
                setBookmarks(parsedBookmarks);
            } else {
                console.log("No bookmarks found in AsyncStorage, checking DefaultPreference");
                const oldBookmarks = await DefaultPreference.get("CapacitorStorage.bookmarks");
                if (oldBookmarks) {
                    const parsedBookmarks = JSON.parse(oldBookmarks) as Bookmark[];
                    setBookmarks(parsedBookmarks);
                    await saveBookmarks(parsedBookmarks);
                } else {
                    setBookmarks([]);
                }
            }
        } catch (error) {
            console.error("Error loading bookmarks:", error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            // This runs every time the screen comes into focus
            loadBookmarks(); // or any other logic

            return () => {
                // Optional cleanup when screen loses focus
            };
        }, [])
    );

    useLayoutEffect(() => {
        if (!context) return;

        const fetchData = async () => {
            try {
                // Load recent searches from AsyncStorage
                await loadBookmarks();
            } catch (error) {
                console.error("Error loading song data:", error);
            } finally {
            }
        };

        fetchData();
    }, [context?.BOOK_DATA]);

    useEffect(() => {
        if (!context) return;
        const fetch = async () => {
            const allSongs = await Promise.all(
                bookmarks.map(async (bookmark) => {
                    const bookData = context.BOOK_DATA[bookmark.book];
                    const songData = await getSongData(bookmark.book);
                    if (songData && bookData) {
                        const song = songData[bookmark.number];
                        if (song) {
                            return {
                                ...song,
                                book: bookData,
                                number: bookmark.number,
                                stripped_title: stripSearchText(song.title),
                                stripped_first_line: stripSearchText(song.first_line ?? "")
                            } as SongSearchInfo;
                        } else {
                            console.warn(`Song number ${bookmark.number} not found in book ${bookmark.book}`);
                        }
                    } else {
                        console.warn(`Book data for ${bookmark.book} not found`);
                    }
                    return null;
                })
            );

            const validSongs = allSongs.filter((s): s is SongSearchInfo => s !== null);
            setSongList(validSongs);


            console.log("Loaded song data.");
            setLoading(false);
        }
        fetch();
    }, [bookmarks]);

    const searchInputRef = useRef<TextInput>(null);

    const scrollViewRef = useRef<FlatList>(null);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const filteredData = useMemo(() => {
        return songList
            .filter((s) =>
                s.stripped_title?.includes(stripSearchText(search)) ||
                s?.stripped_first_line?.includes(stripSearchText(search)) ||
                s?.number == stripSearchText(search)
            )
            .sort((a, b) =>
                a.title.replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "").localeCompare(
                    b.title.replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "")
                )
            );
    }, [search, songList]);

    const UnderlayRight = () => {
        const { close, percentOpen, item } = useSwipeableItemParams<string>();
        const animatedStyles = useAnimatedStyle(() => ({
            transform: [{ translateX: (1 - (percentOpen.value)) * 100 }],
            opacity: percentOpen.value,
        }));
        return (
            <Animated.View style={[styles.deleteButtonContainer, animatedStyles]}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={async () => {
                        // fetch song information
                        if (!item) {
                            console.error("No item to delete");
                            return;
                        }
                        const [bookShort, number] = item.split(',');
                        const bookData = context?.BOOK_DATA[bookShort];
                        if (!bookData) {
                            console.error(`Book data for ${bookShort} not found`);
                            return;
                        }
                        const songData = await getSongData(bookShort);
                        const song = songData[number];

                        Alert.alert(
                            i18n.t('remove') + ` "${song.title}"`,
                            i18n.t('removeMessage'),
                            [
                                {
                                    text: i18n.t('cancel'),
                                    style: 'cancel',
                                },
                                {
                                    text: i18n.t('delete'),
                                    style: 'destructive',
                                    onPress: () => {
                                        // Remove the item from the bookmarks
                                        setBookmarks((prev) => {
                                            const newBookmarks = prev.filter(b => b.book + ',' + b.number !== item);
                                            saveBookmarks(newBookmarks);
                                            return newBookmarks;
                                        });
                                        close();
                                    }
                                }
                            ]
                        )
                    }}
                    style={[styles.deleteButton]}
                >
                    <IconSymbol
                        name="trash"
                        size={24}
                        weight='light'
                        color='white' />
                </TouchableOpacity>
            </Animated.View>
        );
    };
    const renderItem = ({ item, index }: { item: SongSearchInfo, index: number }) => {
        return (
            <SwipeableItem
                item={item.book.name.short + ',' + item.number}
                key={item.book.name.short + ',' + item.number}
                renderUnderlayLeft={() => <UnderlayRight />}
                snapPointsLeft={[80]}
            >
                <TouchableOpacity
                    style={{
                        borderRadius: 12,
                        backgroundColor: item.book.primaryColor,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingVertical: 10, // Add padding to allow content to grow
                        minHeight: 60, // Ensure a minimum height of 60
                        marginBottom: index === filteredData.length - 1 ? 100 : 8, // Add margin only to the last item
                    }}

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

                    activeOpacity={0.7}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
                        <View style={{ width: '80%', alignSelf: 'flex-start' }}>
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'medium', textAlign: 'left' }}>{item.title}</Text>
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'left' }}>{item.book.name.medium}</Text>
                        </View>
                        <View style={{ width: '20%', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'normal', textAlign: 'right' }}>#{item.number}</Text>
                        </View>
                    </View>

                </TouchableOpacity>
            </SwipeableItem>
        );
    };

    return (
        <>
            {loading ? (
                <ActivityIndicator size="large" color={Colors[theme]['text']} />
            ) : (
                <FlatList
                    ref={scrollViewRef}
                    scrollEnabled={scrollEnabled}
                    data={filteredData}
                    keyboardShouldPersistTaps='always'
                    renderItem={renderItem}
                    style={[styles.scrollView]}
                    ListHeaderComponent={
                        <>
                            <View style={styles.titleContainer}>
                                <Text style={styles.textStyle}>{i18n.t('bookmarks')}</Text>
                            </View>
                            <SearchBar
                                ref={searchInputRef}
                                value={search}
                                onChangeText={setSearch}
                                onFocus={() => {
                                    setSearchBarFocused(true);
                                }}
                                onCancel={() => {
                                    setSearchBarFocused(false);
                                }}
                                inputStyle={styles.searchBarContainer}
                                placeholder={i18n.t('search')}
                                style={styles.searchBar}
                            />
                        </>
                    }
                />
            )}
        </>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        deleteButtonContainer: {
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 70,
            alignItems: 'center',
            justifyContent: 'flex-start',
        },
        deleteButton: {
            backgroundColor: '#fd3b31',
            width: 70,
            height: '95%',
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
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
        },
        searchBar: {
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
        text: {
            color: "black",
            fontSize: 24,
            fontWeight: "bold",
            textAlign: "center",
        },
        scrollView: {
            paddingTop: 15,
            paddingBottom: 15,
            paddingRight: 20,
            paddingLeft: 20,
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
        fadedText: {
            fontSize: 24,
            fontWeight: '500',
            color: Colors[theme]['fadedText'], // Dynamically set text color using useThemeColor
            fontFamily: 'Lato'
        },
        descriptionText: {
            fontSize: 16,
            fontWeight: '400',
            color: Colors[theme]['fadedText'], // Dynamically set text color using useThemeColor
            fontFamily: 'Lato',
            textAlign: 'center'
        }
    });

};