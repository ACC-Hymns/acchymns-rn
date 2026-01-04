import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { Bookmark, BookSummary, Song, SongList, SongSearchInfo } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Text, StyleSheet, SafeAreaView, ScrollView, View, useColorScheme, Platform, ActivityIndicator, TouchableOpacity, Dimensions, Button, Alert, TouchableWithoutFeedback, Keyboard, Pressable } from 'react-native';
import { FlatList, TextInput } from 'react-native-gesture-handler';
import { Divider, Icon } from 'react-native-elements'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchHistoryItem } from '@/components/SearchHistoryItem';
import React from 'react';
import { useI18n } from '@/hooks/useI18n';
import StyledText from '@/components/StyledText';
import GenericGradientButton from '@/components/GenericGradientButton';
import { SearchBar } from '@rneui/themed';
import { fontFamily } from '@/constants/assets';
import * as ContextMenu from 'zeego/context-menu'
import { IconSymbol } from '@/components/ui/IconSymbol';



export default function SearchScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);

    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const context = useContext(HymnalContext);
    const [songList, setSongList] = useState<SongSearchInfo[]>([]);
    const [searchBarFocused, setSearchBarFocused] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const i18n = useI18n();

    function stripSearchText(text: string) {
        return text
            .replace(/[.,/#!$%^&*;:{}=\-_'’"`~()]/g, "")
            .replace(/s{2,}/g, " ")
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "");
    }
    const RECENT_SEARCHES_KEY = 'recent_searches';
    const saveSearches = async (searches: string[]) => {
        try {
            await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
        } catch (error) {
            console.error("Error saving searches:", error);
        }
    };
    const loadSearches = async () => {
        try {
            const searches = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
            if (searches !== null) {
                setSearchHistory(JSON.parse(searches));
            }
        } catch (error) {
            console.error("Error loading searches:", error);
        }
    };
    useFocusEffect(
        useCallback(() => {

            return () => {
                // Optional cleanup when screen loses focus
                setIsNavigating(false);
            };
        }, [])
    );

    useLayoutEffect(() => {
        if (!context) return;

        const fetchData = async () => {
            try {
                let songList: SongSearchInfo[] = [];
                for (const id in context.BOOK_DATA) {
                    const songData = await getSongData(id);
                    if (!songData)
                        continue;

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

                // Load recent searches from AsyncStorage
                await loadSearches();
                console.log("Loaded recent searches:", searchHistory);

                console.log("Loaded song data.");
                setLoading(false);
            } catch (error) {
                console.error("Error loading song data:", error);
            } finally {
            }
        };

        fetchData();
    }, [context?.BOOK_DATA]);


    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const searchInputRef = useRef<TextInput>(null);

    function addToSearchHistory(search: string) {
        setSearchHistory((prevHistory) => {
            const newHistory = [...prevHistory];
            if (newHistory.includes(search)) {
                // remove the search from the history if it exists
                newHistory.splice(newHistory.indexOf(search), 1);
            }

            // move the search to the top
            newHistory.unshift(search);

            saveSearches(newHistory); // Save the updated search history to AsyncStorage

            return newHistory.slice(0, 5); // Limit to 5 items
        });
    }

    const scrollViewRef = useRef<FlatList>(null);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [dataSource, setDataSource] = useState<SongSearchInfo[]>(songList);
    useEffect(() => {
        const stripped_search = stripSearchText(search);
        setDataSource([...(search.trim().length > 0 ? songList : [])]
            .filter((s) =>
                s.stripped_title?.includes(stripped_search) ||
                s?.stripped_first_line?.includes(stripped_search) ||
                s?.number == stripped_search
            )
            .sort((a, b) =>
                a.title.replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "").localeCompare(
                    b.title.replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "")
                )
            ));
    }, [search, songList]);
    // Select 10 random songs from songList as featured songs
    const featuredList = songList
        .sort(() => 0.5 - Math.random())
        .slice(0, 10);

    const BOOKMARKS_KEY = 'bookmarks';
    const [existingBookmarks, setExistingBookmarks] = useState<Bookmark[]>([]);
    useLayoutEffect(() => {

        AsyncStorage.getItem(BOOKMARKS_KEY).then((data) => {
            setExistingBookmarks(JSON.parse(data || '[]'));
        });
    }, [existingBookmarks]);
    const addBookmark = async (bookmark: Bookmark) => {
        try {
            const bookmarks: Bookmark[] = existingBookmarks ?? [];
            // Check if the bookmark already exists
            const exists = bookmarks.some(b => b.book === bookmark.book && b.number === bookmark.number);
            if (exists) {
                removeBookmark(bookmark);
                return;
            }
            console.log('Adding bookmark for', bookmark.book, bookmark.number);
            bookmarks.push(bookmark);
            await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
            setExistingBookmarks(bookmarks); // Update the current bookmarks
        } catch (error) {
            console.error("Error saving bookmarks:", error);
        }
    };
    const removeBookmark = async (bookmark: Bookmark) => {
        console.log('Removing bookmark for', bookmark);
        try {
            const bookmarks: Bookmark[] = existingBookmarks ?? [];
            // Filter out the bookmark to be removed
            const updatedBookmarks = bookmarks.filter(b => !(b.book === bookmark.book && b.number === bookmark.number));
            await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updatedBookmarks));
            setExistingBookmarks(updatedBookmarks); // Update the current bookmarks
        } catch (error) {
            console.error("Error removing bookmark:", error);
        }
    };

    const [clearPressed, setClearPressed] = useState<boolean>(false);
    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            {loading ? (
                <ActivityIndicator size="large" color={Colors[theme]['text']} />
            ) : (
                <View style={{ flex: 1 }}>
                    <FlatList
                        ref={scrollViewRef}
                        scrollEnabled={scrollEnabled}
                        data={dataSource}
                        keyboardShouldPersistTaps='always'
                        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                        renderItem={({ item, index }) => (
                            <ContextMenu.Root>
                                <ContextMenu.Trigger>
                                    <GenericGradientButton
                                        primaryColor={item.book.primaryColor}
                                        secondaryColor={item.book.secondaryColor}
                                        onLongPress={() => {

                                        }}
                                        onPress={() => {
                                            if (item.book.name.short && item.number) {
                                                router.navigate({ pathname: '/display/[id]/[number]', params: { id: item.book.name.short, number: item.number } });
                                            } else {
                                                console.error("Invalid item data: ", item);
                                            }
                                        }}
                                        style={{
                                            borderRadius: 12,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            minHeight: 84 // Ensure a minimum height of 60
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
                                            <View style={{ width: '80%', alignSelf: 'flex-start', gap: 4 }}>
                                                <StyledText numberOfLines={1} style={{ color: '#fff', fontSize: 20, fontFamily: 'Lato', fontWeight: 400, textAlign: 'left' }}>{item.title}</StyledText>
                                                <StyledText style={{ color: '#fff', fontSize: 20, fontFamily: 'Lato', fontWeight: 700, textAlign: 'left' }}>{item.book.name.medium}</StyledText>
                                            </View>
                                            <View style={{ width: '20%', alignItems: 'flex-end', justifyContent: 'center' }}>
                                                <StyledText style={{ color: '#fff', fontSize: 20, fontFamily: 'Lato', fontWeight: 700, textAlign: 'right' }}>#{item.number}</StyledText>
                                            </View>
                                        </View>
                                    </GenericGradientButton>
                                </ContextMenu.Trigger>
                                <ContextMenu.Content>
                                    <ContextMenu.Item key="actions" destructive={existingBookmarks.some(b => b.book === item.book.name.short && b.number === item.number)} onSelect={async () => {
                                        // fetch song information
                                        await addBookmark({
                                            book: item.book.name.short,
                                            number: item.number ?? '',
                                        })
                                    }}>
                                        <ContextMenu.ItemTitle>{existingBookmarks.some(b => b.book === item.book.name.short && b.number === item.number) ? 'Remove Bookmark' : 'Add Bookmark'} </ContextMenu.ItemTitle>
                                        <ContextMenu.ItemIcon ios={{ name: 'bookmark' }}>
                                            <IconSymbol name='bookmark' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                                        </ContextMenu.ItemIcon>
                                    </ContextMenu.Item>
                                </ContextMenu.Content>
                            </ContextMenu.Root>
                        )
                        }
                        style={[styles.scrollView]}
                        ListFooterComponent={() => <View style={{ height: 100 }} />}
                        ListHeaderComponent={
                            <>
                                <View style={styles.titleContainer}>
                                    <StyledText style={styles.textStyle}>{i18n.t('search')}</StyledText>
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
                                    onEndEditing={() => {
                                        // when user searches, add to search history
                                        if (search.trim().length > 0) {
                                            addToSearchHistory(search);
                                        } else {
                                            // cancel the search
                                            if (searchInputRef.current) {
                                                searchInputRef.current.blur();
                                            }
                                        }
                                    }}
                                    inputStyle={styles.searchBarInput}
                                    containerStyle={styles.searchBarContainer}
                                    inputContainerStyle={styles.searchBarInnerContainer}
                                    placeholder={i18n.t('search')}
                                    placeholderTextColor={Colors[theme].fadedText}
                                    searchIcon={<Icon name="search" type="ionicon" color={Colors[theme].fadedText} size={18} />} // Custom search icon
                                    cancelIcon={<Icon name="close" type="ionicon" color={Colors[theme].fadedText} size={18} />} // Custom search icon
                                    round={true}
                                    showCancel={true}
                                />
                                {
                                    (searchHistory.length > 0 && search.trim().length == 0) && (
                                        <View style={styles.searchHistoryContainer}>
                                            <View style={styles.searchHistoryHeader}>
                                                <StyledText style={styles.searchHistoryTitle}>{i18n.t('recent')}</StyledText>
                                                <Pressable
                                                    hitSlop={8}
                                                    onPress={() => {
                                                        Alert.alert(i18n.t('clearHistory'), i18n.t('clearHistoryMessage'), [
                                                            {
                                                                text: i18n.t('cancel'),
                                                                onPress: () => {

                                                                },
                                                                style: 'cancel',
                                                                isPreferred: true
                                                            },
                                                            {
                                                                text: i18n.t('clearAll'),
                                                                onPress: () => {
                                                                    setSearchHistory([]);
                                                                    saveSearches([]);
                                                                },
                                                                style: 'destructive'
                                                            },
                                                        ]);
                                                    }}
                                                    onPressIn={() => {
                                                        setClearPressed(true);
                                                    }}
                                                    onPressOut={() => {
                                                        setClearPressed(false);
                                                    }}
                                                >
                                                    <StyledText style={[styles.clearButton, { color: clearPressed ? Colors[theme].primaryFaded : Colors[theme].primary }]}>{i18n.t('clear')}</StyledText>
                                                </Pressable>
                                            </View>
                                            <Divider />
                                            <FlatList
                                                style={{ maxHeight: 300 }}
                                                scrollEnabled={scrollEnabled}
                                                data={searchHistory}
                                                keyboardShouldPersistTaps='handled'
                                                renderItem={({ item }) => (
                                                    <SearchHistoryItem
                                                        item={item}
                                                        onPress={() => {
                                                            setSearch(item);
                                                            addToSearchHistory(item);
                                                        }}
                                                        onGestureStart={() => {
                                                            // disable scrolling when user is dragging
                                                            setScrollEnabled(false);
                                                        }}
                                                        onGestureEnd={() => {
                                                            // enable scrolling when user is done dragging
                                                            setScrollEnabled(true);
                                                        }}
                                                        onDelete={() => {
                                                            console.log('Deleting item:', item);
                                                            setSearchHistory((prevHistory) => {
                                                                const newHistory = [...prevHistory];
                                                                newHistory.splice(newHistory.indexOf(item), 1);

                                                                saveSearches(newHistory); // Save the updated search history to AsyncStorage
                                                                return newHistory;
                                                            });
                                                        }}
                                                        isLastItem={item === searchHistory[searchHistory.length - 1]}
                                                    />
                                                )}
                                            >
                                            </FlatList>
                                        </View>
                                    )
                                }
                            </>
                        }
                    />
                </View>
            )}
        </TouchableWithoutFeedback>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        searchHistoryTitle: {
            fontSize: 18,
            fontWeight: 'medium',
            color: Colors[theme]['fadedText'],
        },
        clearButton: {
            marginBottom: 8,
            marginRight: 8,
            fontSize: 18,
            fontWeight: 'medium',
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
        searchBarContainer: {
            backgroundColor: Colors[theme].background,
            marginHorizontal: -8,
            marginBottom: 20,
            borderBottomColor: 'transparent',
            borderTopColor: 'transparent',
        },
        searchBarInnerContainer: {
            backgroundColor: Colors[theme].searchBarBackground,
            height: 38,
            padding: Platform.OS === 'ios' ? 2 : 0,
        },
        searchBarInput: {
            color: Colors[theme].text,
            fontFamily: fontFamily.regular,
            fontSize: 18,
            minHeight: 38,
            padding: 0,
            margin: 0,
            borderWidth: 0
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
            backgroundColor: Colors[theme].background,

            paddingHorizontal: 20,
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
            fontFamily: 'Lato'
        },
        screenContainer: {
            flex: 1, // Ensures the container takes up the full screen
            backgroundColor: Colors[theme].background // Dynamically set background color using useThemeColor
        },
        titleContainer: {
            marginTop: 18,
            marginBottom: 15,
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