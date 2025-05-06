import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookSummary, SongList } from '@/constants/types';
import { getSongData, HYMNAL_FOLDER } from '@/scripts/hymnals';
import { Gesture, GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { Zoomable, ZoomableRef } from '@likashefqet/react-native-image-zoom';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Pdf from 'react-native-pdf';

export default function DisplayScreen() {
    const params = useLocalSearchParams<{ id: string, number: string}>();
    const MIN_SCALE = 1;
    const MAX_SCALE = 5;
    
    
    // get book data from context
    const context = useContext(HymnalContext);
    const [bookData, setBookData] = useState<BookSummary | null>(null);
    const [songData, setSongData] = useState<SongList | null>(null);
    const [imageURI, setImageURI] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();
    const zoomableRef = useRef<ZoomableRef>(null);

    const scale = useSharedValue(1);
    
    useLayoutEffect(() => {
        if (!context) return;

        const bData = context.BOOK_DATA[params.id as string];
        setBookData(bData);
        if (!bookData) return;

        // get image URI from book data

        navigation.setOptions({ title: params.number });

        const fetchData = async () => {
            try {
                const data = await getSongData(params.id as string);
                setSongData(data);

                const filePath = `${FileSystem.documentDirectory}${HYMNAL_FOLDER}/${bData.name.short}/songs/${params.number}.${bData.fileExtension}`.replace(/\/\//g, '/');

                const normalizedFilePath = filePath.replace(/\\/g, '/').replace(/\/\//g, '/');

                const fileInfo = await FileSystem.getInfoAsync(normalizedFilePath);

                if (fileInfo.exists) {
                    const imageURI = fileInfo.exists ? normalizedFilePath : null;
                    setImageURI(imageURI);
                    console.log("Image URI:", imageURI);
                    console.log("File size (KB):", (fileInfo.size / 1024).toFixed(2));
                } else {
                    console.error("File does not exist:", filePath);
                }
            } catch (error) {
                console.error("Error loading song data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [bookData, params.id, navigation]);

    const animatedStyle = useAnimatedStyle(
        () => ({
          borderRadius: 30 / scale.value,
        }),
        [scale]
      );

    return (
            <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
                {imageURI ? (
                    <Pdf source={{uri: imageURI}} />
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: 'white' }}>{loading ? 'Loading...' : 'Image not available'}</Text>
                    </View>
                )}
            </SafeAreaView>
    );
}