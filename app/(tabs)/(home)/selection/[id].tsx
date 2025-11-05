import React, { use, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, useColorScheme, Dimensions, Button, TouchableHighlight } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookIndex, BookSummary, SongList, SortMode } from '@/constants/types';
import { getBookIndex, getSongData } from '@/scripts/hymnals';
import { Gesture, GestureHandlerRootView, Pressable, ScrollView } from 'react-native-gesture-handler';
import { Colors } from '@/constants/Colors';
import { HymnalMoreMenu } from '@/components/HymnalMoreMenu';
import { IconSymbol } from '@/components/ui/IconSymbol';
import StyledText from '@/components/StyledText';
import { useSongListData } from '@/hooks/useSongListData';
import { useBookData } from '@/hooks/useBookData';

export default function SelectionScreen() {
    const { id } = useLocalSearchParams();
    const theme = useColorScheme() ?? 'light';

    // get book data from context
    const context = useContext(HymnalContext);

    const book = useBookData(id as string, context);
    const {songs, topicalIndex, loading, error } = useSongListData(book);

    const [sortMode, setSortMode] = useState<SortMode>(SortMode.NUMERICAL);
    const [isNavigating, setIsNavigating] = useState(false);
    const navigation = useNavigation();
    if (context) {
        context.setSortMode = handleSortModeChange;
    }

    useLayoutEffect(() => {
        if (!book) return;

        navigation.setOptions({
            title: book.name.medium,
            headerTitleAlign: 'center',
            headerRight: () => (
                <HymnalMoreMenu bookSummary={book} />
            ),
        });
    }, [book, id, navigation]);

    function handleSortModeChange(mode: SortMode) {
        setSortMode(mode);
        navigation.setOptions({
            headerShadowVisible: false,
        });
    }

    const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({});

    const toggleDropdown = (index: string) => {
        setOpenDropdowns(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            {book && songs && (
                <View style={{ flex: 1, backgroundColor: Colors[theme]['background'] }}>
                    {sortMode === SortMode.NUMERICAL && (
                        <View style={{ flex: 1 }}>
                            {(context?.legacyNumberGrouping) ? (
                                <FlatList // NUMERICAL LIST
                                    data={Object.keys(songs).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))}
                                    keyExtractor={(item) => item}
                                    key='legacy'
                                    numColumns={5}
                                    contentContainerStyle={{
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        paddingBottom: 120 // Add padding to the bottom to ensure all items are scrollable
                                    }}
                                    style={{ flex: 1, width: '100%', paddingTop: 20 }}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={{
                                                margin: 6,
                                                width: 60,
                                                height: 60,
                                                borderRadius: 30,
                                                backgroundColor: book.primaryColor,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}
                                            onPressIn={() => {
                                                router.prefetch({ pathname: '/display/[id]/[number]', params: { id: book.name.short, number: item } });
                                            }}
                                            onPress={() => {
                                                // check if im already navigating
                                                router.navigate({ pathname: '/display/[id]/[number]', params: { id: book.name.short, number: item } });
                                            }}
                                        >
                                            <StyledText style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{item}</StyledText>
                                        </TouchableOpacity>
                                    )}
                                    onScroll={(event) => {
                                        if (event.nativeEvent.contentOffset.y > 0) {
                                            navigation.setOptions({
                                                headerShadowVisible: true,
                                            });
                                        } else {
                                            navigation.setOptions({
                                                headerShadowVisible: false,
                                            });
                                        }
                                    }}
                                />
                            ) : (
                                <FlatList
                                    data={Object.keys(songs).reduce((ranges: number[], number: string) => {
                                        const num = parseInt(number);
                                        let rangeStart, rangeEnd;
                                        if (num <= 99) {
                                            rangeStart = 1;
                                            rangeEnd = 99
                                        } else {
                                            rangeStart = Math.floor(num / 100) * 100;
                                            rangeEnd = rangeStart + 99;
                                        }

                                        // Check if there are any songs in this range
                                        const songsInRange = Object.keys(songs).some(songNumber => {
                                            const n = parseInt(songNumber);
                                            return n >= rangeStart && n <= rangeEnd;
                                        });

                                        if (!ranges.includes(rangeStart) && songsInRange) {
                                            ranges.push(rangeStart);
                                        }
                                        return ranges;
                                    }, [] as number[])}
                                    key='new'
                                    contentContainerStyle={{ paddingBottom: 120 }}
                                    keyExtractor={(rangeStart) => rangeStart.toString()}
                                    renderItem={({ item: rangeStart, index }) => {
                                        // Find the highest song number in this range
                                        const maxInRange = Math.min(
                                            (index == 0 ? rangeStart + 98 : rangeStart + 99),
                                            Math.max(...Object.keys(songs)
                                                .map(num => parseInt(num))
                                                .filter(num => num >= rangeStart && num <= rangeStart + 99)
                                            )
                                        );

                                        const songsInRange = Object.keys(songs)
                                            .filter(num => {
                                                const songNum = parseInt(num);
                                                return songNum >= rangeStart && songNum <= maxInRange;
                                            })
                                            .sort((a, b) => parseInt(a) - parseInt(b));

                                        return (
                                            <View key={rangeStart} style={{ marginTop: index === 0 ? 12 : 0 }}>
                                                <TouchableHighlight
                                                    underlayColor={Colors[theme].divider}
                                                    onPress={() => {
                                                        toggleDropdown(index.toString())
                                                    }}
                                                    style={{
                                                        backgroundColor: Colors[theme].headerBackground,
                                                        borderRadius: 12,
                                                        height: 60,
                                                        marginVertical: 4,
                                                        marginHorizontal: 15,
                                                        shadowColor: '#000',
                                                        shadowOffset: {
                                                            width: 0,
                                                            height: 2,
                                                        },
                                                        shadowOpacity: 0.05,
                                                        shadowRadius: 5,
                                                        elevation: 3,
                                                    }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: '100%' }}>
                                                        <StyledText style={{ fontSize: 18, color: Colors[theme].text }}>{rangeStart === maxInRange ? rangeStart : `${rangeStart} - ${maxInRange}`}</StyledText>
                                                        <IconSymbol
                                                            name={openDropdowns[index.toString()] ? "chevron.up" : "chevron.down"}
                                                            size={18}
                                                            weight="medium"
                                                            color={Colors[theme].icon}
                                                        />
                                                    </View>
                                                </TouchableHighlight>

                                                {openDropdowns[index.toString()] && (
                                                    <View style={{ marginHorizontal: 15, marginTop: 5, marginBottom: 15 }}>
                                                        <FlatList
                                                            data={songsInRange}
                                                            keyExtractor={(number) => number}
                                                            renderItem={({ item: number }) => (
                                                                <TouchableOpacity
                                                                    key={number}
                                                                    onPress={() => {
                                                                        if (isNavigating) return;
                                                                        router.push({
                                                                            pathname: '/display/[id]/[number]',
                                                                            params: { id: book.name.short, number }
                                                                        });
                                                                        setIsNavigating(true);
                                                                        setTimeout(() => setIsNavigating(false), 400);
                                                                    }}
                                                                    style={{
                                                                        padding: 12,
                                                                        borderRadius: 8,
                                                                        backgroundColor: Colors[theme].background,
                                                                        marginVertical: 2,
                                                                    }}>
                                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <StyledText style={{ color: Colors[theme].fadedText, fontSize: 20, width: '18%', lineHeight: 25, fontWeight: 'bold' }}>
                                                                            #{number}
                                                                        </StyledText>
                                                                        <StyledText numberOfLines={1} style={{ color: Colors[theme].text, fontSize: 16, flex: 1, textAlign: 'left', lineHeight: 25 }}>
                                                                            {songs[number].title}
                                                                        </StyledText>
                                                                    </View>
                                                                </TouchableOpacity>
                                                            )}
                                                        />
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    }}
                                    onScroll={(event) => {
                                        if (event.nativeEvent.contentOffset.y > 0) {
                                            navigation.setOptions({
                                                headerShadowVisible: true,
                                            });
                                        } else {
                                            navigation.setOptions({
                                                headerShadowVisible: false,
                                            });
                                        }
                                    }}
                                />
                            )}
                        </View>
                    )}
                    {sortMode === SortMode.ALPHABETICAL && (
                        <View style={{ flex: 1 }}>
                            {(context?.legacyNumberGrouping) ? (
                                <FlatList // ALPHABETICAL LIST
                                    data={Object.keys(songs).sort((a, b) => songs[a].title.replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "").localeCompare(songs[b].title.replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "")))}
                                    keyExtractor={(item) => item}
                                    key='legacy'
                                    contentContainerStyle={{
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        paddingBottom: 120 // Add padding to the bottom to ensure all items are scrollable
                                    }}
                                    style={{ flex: 1, width: '100%', paddingTop: 20 }}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={{
                                                margin: 4,
                                                width: Dimensions.get('window').width - 60,
                                                borderRadius: 12,
                                                backgroundColor: book.primaryColor,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                paddingVertical: 10, // Add padding to allow content to grow
                                                minHeight: 60, // Ensure a minimum height of 60
                                            }}

                                            onPress={() => {
                                                if (isNavigating) return;
                                                router.push({ pathname: '/display/[id]/[number]', params: { id: book.name.short, number: item } });
                                                setIsNavigating(true);
                                                setTimeout(() => setIsNavigating(false), 400); // or after navigation completes
                                            }}

                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
                                                <View style={{ width: '80%', alignSelf: 'flex-start' }}>
                                                    <StyledText style={{ color: '#fff', fontSize: 20, fontWeight: 'medium', textAlign: 'left' }}>{songs[item].title}</StyledText>
                                                </View>
                                                <View style={{ width: '20%', alignItems: 'flex-end', justifyContent: 'center' }}>
                                                    <StyledText style={{ color: '#fff', fontSize: 20, fontWeight: 'normal', textAlign: 'right' }}>#{item}</StyledText>
                                                </View>
                                            </View>

                                        </TouchableOpacity>
                                    )}
                                />
                            ) : (
                                <FlatList // ALPHABETICAL LIST
                                    data={Object.keys(songs).sort((a, b) => songs[a].title.replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "").localeCompare(songs[b].title.replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "")))}
                                    keyExtractor={(number) => number}
                                    key='new'
                                    contentContainerStyle={{
                                        paddingBottom: 120 // Add padding to the bottom to ensure all items are scrollable
                                    }}
                                    renderItem={({ item: number, index }) => (
                                        <TouchableOpacity
                                            key={number}
                                            onPress={() => {
                                                if (isNavigating) return;
                                                router.push({
                                                    pathname: '/display/[id]/[number]',
                                                    params: { id: book.name.short, number }
                                                });
                                                setIsNavigating(true);
                                                setTimeout(() => setIsNavigating(false), 400);
                                            }}
                                            style={{
                                                marginTop: index === 0 ? 12 : 0,
                                                padding: 12,
                                                borderRadius: 8,
                                                backgroundColor: Colors[theme].background,
                                                marginHorizontal: 15
                                            }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <StyledText style={{ color: Colors[theme].fadedText, fontSize: 20, width: '18%', lineHeight: 25, fontWeight: 'bold' }}>
                                                    #{number}
                                                </StyledText>
                                                <StyledText numberOfLines={1} style={{ color: Colors[theme].text, fontSize: 16, flex: 1, textAlign: 'left', lineHeight: 25 }}>
                                                    {songs[number].title}
                                                </StyledText>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                    onScroll={(event) => {
                                        if (event.nativeEvent.contentOffset.y > 0) {
                                            navigation.setOptions({
                                                headerShadowVisible: true,
                                            });
                                        } else {
                                            navigation.setOptions({
                                                headerShadowVisible: false,
                                            });
                                        }
                                    }}
                                />
                            )}
                        </View>
                    )}
                    {sortMode === SortMode.TOPICAL && (
                        <View style={{ flex: 1 }}>
                            <FlatList
                                data={Object.keys(topicalIndex || {})}
                                contentContainerStyle={{ paddingBottom: 120 }}
                                keyExtractor={(key) => key}
                                renderItem={({ item: key, index }) => {

                                    const songsInTopic = (topicalIndex || {})[key]?.map(song => ({ ...songs[song], number: song })) || [];

                                    return (
                                        <View key={key} style={{ marginTop: index === 0 ? 12 : 0 }}>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    toggleDropdown(key)
                                                }}
                                                style={{
                                                    backgroundColor: Colors[theme].headerBackground,
                                                    shadowColor: '#000',
                                                    shadowOffset: {
                                                        width: 0,
                                                        height: 2,
                                                    },
                                                    shadowOpacity: 0.05,
                                                    shadowRadius: 5,
                                                    elevation: 3,
                                                    borderRadius: 12,
                                                    height: 60,
                                                    marginVertical: 4,
                                                    marginHorizontal: 15,
                                                }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: '100%' }}>
                                                    <StyledText style={{ fontSize: 18, color: Colors[theme].text }}>{key}</StyledText>
                                                    <IconSymbol
                                                        name={openDropdowns[key] ? "chevron.up" : "chevron.down"}
                                                        size={18}
                                                        weight="medium"
                                                        color={Colors[theme].icon}
                                                    />
                                                </View>
                                            </TouchableOpacity>

                                            {openDropdowns[key] && (
                                                <View style={{ marginHorizontal: 15, marginTop: 5, marginBottom: 15 }}>
                                                    <FlatList
                                                        data={songsInTopic}
                                                        keyExtractor={(song) => song.number || ''}
                                                        renderItem={({ item: song }) => (
                                                            <TouchableOpacity
                                                                key={song.number}
                                                                onPress={() => {
                                                                    if (isNavigating) return;
                                                                    router.push({
                                                                        pathname: '/display/[id]/[number]',
                                                                        params: { id: book.name.short, number: song.number }
                                                                    });
                                                                    setIsNavigating(true);
                                                                    setTimeout(() => setIsNavigating(false), 400);
                                                                }}
                                                                style={{
                                                                    padding: 12,
                                                                    borderRadius: 8,
                                                                    backgroundColor: Colors[theme].background,
                                                                    marginVertical: 2,
                                                                }}>
                                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <StyledText style={{ color: Colors[theme].fadedText, fontSize: 20, width: '18%', lineHeight: 25 }}>
                                                                        #{song.number}
                                                                    </StyledText>
                                                                    <StyledText numberOfLines={1} style={{ color: Colors[theme].text, fontSize: 16, flex: 1, textAlign: 'left', lineHeight: 25 }}>
                                                                        {song.title}
                                                                    </StyledText>
                                                                </View>
                                                            </TouchableOpacity>
                                                        )}
                                                    />
                                                </View>
                                            )}
                                        </View>
                                    );
                                }}
                                onScroll={(event) => {
                                    if (event.nativeEvent.contentOffset.y > 0) {
                                        navigation.setOptions({
                                            headerShadowVisible: true,
                                        });
                                    } else {
                                        navigation.setOptions({
                                            headerShadowVisible: false,
                                        });
                                    }
                                }}
                            />
                        </View>
                    )}
                </View>
            )}
        </GestureHandlerRootView>
    );
}