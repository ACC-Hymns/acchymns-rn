import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookSummary, SongList } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import { Gesture, GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';

export default function SelectionScreen() {
    const { id } = useLocalSearchParams();
    
    // get book data from context
    const context = useContext(HymnalContext);
    const [bookData, setBookData] = useState<BookSummary | null>(null);
    const [songData, setSongData] = useState<SongList | null>(null);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();
    
    useLayoutEffect(() => {
        if (!context) return;

        const bData = context.BOOK_DATA[id as string];
        setBookData(bData);
        if (!bookData) return;
        navigation.setOptions({ title: bookData.name.medium });

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

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
                {songData && bookData && (
                    <View style={{ flex: 1 }}>
                        <FlatList
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
                                        margin: 4,
                                        width: 60,
                                        height: 60,
                                        borderRadius: 30,
                                        backgroundColor: bookData.primaryColor,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}

                                    onPress={() => {
                                        router.push({ pathname: '/display/[id]/[number]', params: { id: bookData.name.short, number: item } });
                                    }}

                                    activeOpacity={0.7}
                                >
                                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}
        </GestureHandlerRootView>
    );
}