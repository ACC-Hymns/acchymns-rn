import React from 'react';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { Bookmark, SongSearchInfo } from '@/constants/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Text, StyleSheet, SafeAreaView, ScrollView, View, Platform, ActivityIndicator, TouchableOpacity, Dimensions, Button, Alert, Keyboard, TouchableWithoutFeedback, TextInput, Pressable } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { SearchHistoryItem } from '@/components/SearchHistoryItem';
import SwipeableItem, { SwipeableItemImperativeRef, useSwipeableItemParams } from 'react-native-swipeable-item';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons';
import { padStart } from 'pdf-lib';
import { useI18n } from '@/hooks/useI18n';
import { useColorScheme } from '@/hooks/useColorScheme';
import StyledText from '@/components/StyledText';
import GenericGradientButton from '@/components/GenericGradientButton';
import * as ContextMenu from 'zeego/context-menu'
import { fontFamily } from '@/constants/assets';
import { useSongSearchIndex } from '@/hooks/useSongSearchIndex';
import { filterSongSearch, sortSongsByTitle } from '@/scripts/songSearch';
import { removeBookmark } from '@/scripts/bookmarks';
import { loadBookmarks, saveBookmarks } from '@/scripts/bookmarkStorage';


export default function BookmarkScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);

    const [search, setSearch] = useState("");
    const context = useContext(HymnalContext);
    const songIndex = useSongSearchIndex(context?.BOOK_DATA);
    const [isNavigating, setIsNavigating] = useState(false);
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [bookmarksLoaded, setBookmarksLoaded] = useState(false);

    const i18n = useI18n();

    const refreshBookmarks = useCallback(() => {
        loadBookmarks().then((loaded) => {
            setBookmarks(loaded);
            setBookmarksLoaded(true);
        });
    }, []);

    useFocusEffect(
        useCallback(() => {
            refreshBookmarks();

            return () => {
                setIsNavigating(false);
            };
        }, [refreshBookmarks])
    );

    const songList = useMemo(() => {
        return bookmarks.flatMap((bookmark) => {
            const match = (songIndex.data ?? []).find(
                (song) => song.book.name.short === bookmark.book && song.number === bookmark.number,
            );
            return match ? [match] : [];
        });
    }, [bookmarks, songIndex.data]);

    const loading = !bookmarksLoaded || songIndex.isLoading;

    const scrollViewRef = useRef<FlatList>(null);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const filteredData = useMemo(() => {
        return sortSongsByTitle(filterSongSearch(songList, search));
    }, [search, songList]);

    const renderItem = ({ item, index }: { item: SongSearchInfo, index: number }) => {
        return (
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
                    <ContextMenu.Item key="actions" destructive={true} onSelect={async () => {
                        // fetch song information
                        if (!item) {
                            console.error("No item to delete");
                            return;
                        }
                        const bookShort = item.book.name.short;
                        const number = item.number;
                        if (!number)
                            return;

                        Alert.alert(
                            i18n.t('remove') + ` "${item.title}"`,
                            i18n.t('removeMessage'),
                            [
                                {
                                    text: i18n.t('cancel'),
                                    style: 'cancel',
                                },
                                {
                                    text: i18n.t('remove'),
                                    style: 'destructive',
                                    onPress: () => {
                                        setBookmarks((prev) => {
                                            const newBookmarks = removeBookmark(prev, {
                                                book: bookShort,
                                                number,
                                            });
                                            void saveBookmarks(newBookmarks);
                                            return newBookmarks;
                                        });
                                    }
                                }
                            ]
                        )
                    }}>
                        <ContextMenu.ItemTitle>Remove Bookmark</ContextMenu.ItemTitle>
                        <ContextMenu.ItemIcon ios={{ name: 'trash' }}>
                            <Ionicons name='trash' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                        </ContextMenu.ItemIcon>
                    </ContextMenu.Item>
                </ContextMenu.Content>
            </ContextMenu.Root>
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                {songIndex.isError ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                        <StyledText style={styles.textStyle}>{i18n.t('oops')}</StyledText>
                        <Pressable onPress={() => { void songIndex.refetch(); }}>
                            <StyledText style={styles.textStyle}>{i18n.t('retry')}</StyledText>
                        </Pressable>
                    </View>
                ) : loading ? (
                    <ActivityIndicator size="large" color={Colors[theme]['text']} />
                ) : (
                    <FlatList
                        ref={scrollViewRef}
                        scrollEnabled={scrollEnabled}
                        data={filteredData}

                        contentInsetAdjustmentBehavior='always'
                        keyboardShouldPersistTaps='always'
                        renderItem={renderItem}
                        style={[styles.scrollView]}
                        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                        ListHeaderComponent={
                            <>
                                <View style={styles.titleContainer}>
                                    <StyledText style={styles.textStyle}>{i18n.t('bookmarks')}</StyledText>
                                </View>
                                <View style={styles.searchBarContainer}>
                                    <View style={styles.searchBarInnerContainer}>
                                        <Ionicons
                                            name="search"
                                            size={18}
                                            color={Colors[theme].fadedText}
                                        />
                                        <TextInput
                                            value={search}
                                            onChangeText={setSearch}
                                            style={styles.searchBarInput}
                                            placeholder={i18n.t('search')}
                                            placeholderTextColor={Colors[theme].fadedText}
                                            returnKeyType="search"
                                            clearButtonMode="never"
                                        />
                                        {search.length > 0 && (
                                            <Pressable
                                                hitSlop={8}
                                                onPress={() => setSearch('')}
                                                accessibilityLabel={i18n.t('clear')}
                                            >
                                                <Ionicons
                                                    name="close-circle"
                                                    size={18}
                                                    color={Colors[theme].fadedText}
                                                />
                                            </Pressable>
                                        )}
                                    </View>
                                </View>
                            </>
                        }
                        ListFooterComponent={() => <View style={{ height: 100 }} />}
                    />
                )}
            </View>
        </TouchableWithoutFeedback>
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
            marginBottom: 8,
        },
        deleteButton: {
            backgroundColor: '#fd3b31',
            width: 70,
            height: '100%',
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
        searchBarContainer: {
            marginBottom: 20,
        },
        searchBarInnerContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: Colors[theme].searchBarBackground,
            height: 38,
            borderRadius: 19,
            paddingHorizontal: 10,
            paddingVertical: Platform.OS === 'ios' ? 2 : 0,
        },
        searchBarInput: {
            flex: 1,
            color: Colors[theme].text,
            fontFamily: fontFamily.regular,
            fontSize: 18,
            minHeight: 38,
            padding: 0,
            margin: 0,
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