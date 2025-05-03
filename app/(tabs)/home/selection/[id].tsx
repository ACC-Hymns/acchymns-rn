import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
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
        if (loading) return;

        setLoading(true);

        if (!context) return;

        const data = context.BOOK_DATA[id as string];
        setBookData(data);

        const fetchSongData = async () => {
            const data = await getSongData(id as string);
            setSongData(data);
        }
        fetchSongData();

        setLoading(false);
    }, [context, id, loading]);

    useEffect(() => {
        if (bookData) {
            navigation.setOptions({ title: bookData.name.medium });
        }
    }, [bookData, navigation]);

    return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <ScrollView>
                    {songData && bookData && (
                        <View style={{ flex: 1, marginTop: 20, marginBottom: 75, padding: 20 }}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {Object.entries(songData).map(([key, song]) => (
                                    <View
                                        key={key}
                                        style={{
                                            margin: 4,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <TouchableOpacity
                                            style={{
                                                width: 60,
                                                height: 60,
                                                borderRadius: 30,
                                                backgroundColor: bookData.primaryColor,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{key}</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            </GestureHandlerRootView>
    );
}