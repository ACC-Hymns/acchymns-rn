import React, { use, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, useColorScheme, Dimensions, Button } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookSummary, SongList, SortMode } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import { Gesture, GestureHandlerRootView, Pressable, ScrollView } from 'react-native-gesture-handler';
import { Colors } from '@/constants/Colors';
import { HymnalMoreMenu } from '@/components/HymnalMoreMenu';

export default function SelectionScreen() {
    const { id } = useLocalSearchParams();
    const theme = useColorScheme() ?? 'light';

    // get book data from context
    const context = useContext(HymnalContext);
    const [bookData, setBookData] = useState<BookSummary | null>(null);
    const [songData, setSongData] = useState<SongList | null>(null);
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


    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            {songData && bookData && (
                <View style={{ flex: 1, backgroundColor: Colors[theme]['background'] }}>
                    {sortMode === SortMode.NUMERICAL && (
                        <FlatList // NUMERICAL LIST
                            data={Object.keys(songData).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))}
                            keyExtractor={(item) => item}
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
                                        backgroundColor: bookData.primaryColor,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                    onPressIn={() => {
                                        router.prefetch({ pathname: '/display/[id]/[number]', params: { id: bookData.name.short, number: item } });
                                    }}
                                    onPress={() => {
                                        // check if im already navigating
                                        router.navigate({ pathname: '/display/[id]/[number]', params: { id: bookData.name.short, number: item } });
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                    {sortMode === SortMode.ALPHABETICAL && (
                        <FlatList // ALPHABETICAL LIST
                            data={Object.keys(songData).sort((a, b) => songData[a].title.replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "").localeCompare(songData[b].title.replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "")))}
                            keyExtractor={(item) => item}
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
                                        backgroundColor: bookData.primaryColor,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        paddingVertical: 10, // Add padding to allow content to grow
                                        minHeight: 60, // Ensure a minimum height of 60
                                    }}

                                    onPress={() => {
                                        if (isNavigating) return;
                                        router.push({ pathname: '/display/[id]/[number]', params: { id: bookData.name.short, number: item } });
                                        setIsNavigating(true);
                                        setTimeout(() => setIsNavigating(false), 400); // or after navigation completes
                                    }}

                                    activeOpacity={0.7}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
                                        <View style={{ width: '80%', alignSelf: 'flex-start' }}>
                                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'medium', textAlign: 'left' }}>{songData[item].title}</Text>
                                        </View>
                                        <View style={{ width: '20%', alignItems: 'flex-end', justifyContent: 'center' }}>
                                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'normal', textAlign: 'right' }}>#{item}</Text>
                                        </View>
                                    </View>

                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            )}
        </GestureHandlerRootView>
    );
}