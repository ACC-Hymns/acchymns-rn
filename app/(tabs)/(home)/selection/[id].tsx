import React, { use, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, useColorScheme, Dimensions, Button } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookIndex, BookSummary, SongList, SortMode } from '@/constants/types';
import { getBookIndex, getSongData } from '@/scripts/hymnals';
import { Gesture, GestureHandlerRootView, Pressable, ScrollView } from 'react-native-gesture-handler';
import { Colors } from '@/constants/Colors';
import { HymnalMoreMenu } from '@/components/HymnalMoreMenu';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function SelectionScreen() {
    const { id } = useLocalSearchParams();
    const theme = useColorScheme() ?? 'light';

    // get book data from context
    const context = useContext(HymnalContext);
    const [bookData, setBookData] = useState<BookSummary | null>(null);
    const [songData, setSongData] = useState<SongList | null>(null);
    const [bookIndex, setBookIndex] = useState<BookIndex | null>(null);
    const [sortMode, setSortMode] = useState<SortMode>(SortMode.NUMERICAL);
    const [loading, setLoading] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const navigation = useNavigation();
    if (context) {
        context.setSortMode = handleSortModeChange;
    }

    useLayoutEffect(() => {
        if (!context) return;

        const bData = context.BOOK_DATA[id as string];
        setBookData(bData);
        if (!bookData) return;
        navigation.setOptions({
            title: bookData.name.medium,
            headerTitleAlign: 'center',
            headerRight: () => (
                <HymnalMoreMenu bookSummary={bookData} />
            ),
        });

        const fetchData = async () => {
            try {
                const data = await getSongData(id as string);
                setSongData(data);
                if(bookData.indexAvailable) {
                    const index = await getBookIndex(id as string);
                    setBookIndex(index);
                }
            } catch (error) {
                console.error("Error loading song data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [bookData, id, navigation]);

    function handleSortModeChange(mode: SortMode) {
        setSortMode(mode);
    }

    const [openDropdowns, setOpenDropdowns] = useState<{ [key: number]: boolean }>({});

    const toggleDropdown = (index: number) => {
        setOpenDropdowns(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            {songData && bookData && (
                <View style={{ flex: 1, backgroundColor: Colors[theme]['background'] }}>
                    {sortMode === SortMode.NUMERICAL && (
                        <View style={{ flex: 1 }}>
                            <FlatList
                                data={Object.keys(songData).reduce((ranges: number[], number: string) => {
                                    const num = parseInt(number);
                                    let rangeStart;
                                    if (num <= 99) {
                                        rangeStart = 1;
                                    } else {
                                        rangeStart = Math.floor(num / 100) * 100;
                                    }
                                    const rangeEnd = rangeStart + 99;

                                    // Check if there are any songs in this range
                                    const songsInRange = Object.keys(songData).some(songNumber => {
                                        const n = parseInt(songNumber);
                                        return n >= rangeStart && n <= rangeEnd;
                                    });

                                    if (!ranges.includes(rangeStart) && songsInRange) {
                                        ranges.push(rangeStart);
                                    }
                                    return ranges;
                                }, [] as number[])}
                                contentContainerStyle={{ paddingBottom: 120 }}
                                keyExtractor={(rangeStart) => rangeStart.toString()}
                                renderItem={({ item: rangeStart, index }) => {
                                    // Find the highest song number in this range
                                    const maxInRange = Math.min(
                                        rangeStart + 99,
                                        Math.max(...Object.keys(songData)
                                            .map(num => parseInt(num))
                                            .filter(num => num >= rangeStart && num <= rangeStart + 99)
                                        )
                                    );

                                    const songsInRange = Object.keys(songData)
                                        .filter(num => {
                                            const songNum = parseInt(num);
                                            return songNum >= rangeStart && songNum <= maxInRange;
                                        })
                                        .sort((a, b) => parseInt(a) - parseInt(b));

                                    return (
                                        <View key={rangeStart} style={{ marginTop: index === 0 ? 12 : 0 }}>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    toggleDropdown(index)
                                                }}
                                                style={{
                                                    backgroundColor: Colors[theme].headerBackground,
                                                    shadowColor: 'black',
                                                    shadowOffset: { width: 0, height: 0 },
                                                    shadowOpacity: 0.25,
                                                    shadowRadius: 1,
                                                    elevation: 5,
                                                    borderRadius: 12,
                                                    height: 60,
                                                    marginVertical: 4,
                                                    marginHorizontal: 15,
                                                }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: '100%' }}>
                                                    <Text style={{ fontSize: 18, color: Colors[theme].text }}>{rangeStart === maxInRange ? rangeStart : `${rangeStart} - ${maxInRange}`}</Text>
                                                    <IconSymbol
                                                        name={openDropdowns[index] ? "chevron.up" : "chevron.down"}
                                                        size={18}
                                                        weight="medium"
                                                        color={Colors[theme].icon}
                                                    />
                                                </View>
                                            </TouchableOpacity>

                                            {openDropdowns[index] && (
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
                                                                        params: { id: bookData.name.short, number }
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
                                                                    <Text style={{ color: Colors[theme].fadedText, fontSize: 20, width: '18%', lineHeight: 25 }}>
                                                                        #{number}
                                                                    </Text>
                                                                    <Text style={{ color: Colors[theme].text, fontSize: 16, flex: 1, textAlign: 'left', lineHeight: 25 }}>
                                                                        {songData[number].title}
                                                                    </Text>
                                                                </View>
                                                            </TouchableOpacity>
                                                        )}
                                                    />
                                                </View>
                                            )}
                                        </View>
                                    );
                                }}
                            />
                        </View>
                    )}
                    {sortMode === SortMode.ALPHABETICAL && (
                        <View>
                            <FlatList // ALPHABETICAL LIST
                                data={Object.keys(songData).sort((a, b) => songData[a].title.replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "").localeCompare(songData[b].title.replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "")))}
                                keyExtractor={(number) => number}
                                renderItem={({ item: number, index }) => (
                                    <TouchableOpacity
                                        key={number}
                                        onPress={() => {
                                            if (isNavigating) return;
                                            router.push({
                                                pathname: '/display/[id]/[number]',
                                                params: { id: bookData.name.short, number }
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
                                            <Text style={{ color: Colors[theme].fadedText, fontSize: 20, width: '18%', lineHeight: 25 }}>
                                                #{number}
                                            </Text>
                                            <Text style={{ color: Colors[theme].text, fontSize: 16, flex: 1, textAlign: 'left', lineHeight: 25 }}>
                                                {songData[number].title}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    )}
                    {sortMode === SortMode.TOPICAL && (
                        <View style={{ flex: 1 }}>
                            <FlatList
                                data={Object.keys(bookIndex || {})}
                                contentContainerStyle={{ paddingBottom: 120 }}
                                keyExtractor={(key) => key}
                                renderItem={({ item: key, index }) => {

                                    const songsInTopic = (bookIndex || {})[key]?.map(song => ({...songData[song], number: song})) || [];

                                    return (
                                        <View key={key} style={{ marginTop: index === 0 ? 12 : 0 }}>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    toggleDropdown(index)
                                                }}
                                                style={{
                                                    backgroundColor: Colors[theme].headerBackground,
                                                    shadowColor: 'black',
                                                    shadowOffset: { width: 0, height: 0 },
                                                    shadowOpacity: 0.25,
                                                    shadowRadius: 1,
                                                    elevation: 5,
                                                    borderRadius: 12,
                                                    height: 60,
                                                    marginVertical: 4,
                                                    marginHorizontal: 15,
                                                }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: '100%' }}>
                                                    <Text style={{ fontSize: 18, color: Colors[theme].text }}>{key}</Text>
                                                    <IconSymbol
                                                        name={openDropdowns[index] ? "chevron.up" : "chevron.down"}
                                                        size={18}
                                                        weight="medium"
                                                        color={Colors[theme].icon}
                                                    />
                                                </View>
                                            </TouchableOpacity>

                                            {openDropdowns[index] && (
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
                                                                        params: { id: bookData.name.short, number: song.number }
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
                                                                    <Text style={{ color: Colors[theme].fadedText, fontSize: 20, width: '18%', lineHeight: 25 }}>
                                                                        #{song.number}
                                                                    </Text>
                                                                    <Text style={{ color: Colors[theme].text, fontSize: 16, flex: 1, textAlign: 'left', lineHeight: 25 }}>
                                                                        {song.title}
                                                                    </Text>
                                                                </View>
                                                            </TouchableOpacity>
                                                        )}
                                                    />
                                                </View>
                                            )}
                                        </View>
                                    );
                                }}
                            />
                        </View>
                    )}
                </View>
            )}
        </GestureHandlerRootView>
    );
}