import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookSummary, SongList } from '@/constants/types';
import { getSongData, HYMNAL_FOLDER } from '@/scripts/hymnals';
import { Gesture, GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { Zoomable } from '@likashefqet/react-native-image-zoom';
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';

export default function DisplayScreen() {
    const params = useLocalSearchParams<{ id: string, number: string}>();
    
    // get book data from context
    const context = useContext(HymnalContext);
    const [bookData, setBookData] = useState<BookSummary | null>(null);
    const [songData, setSongData] = useState<SongList | null>(null);
    const [imageURI, setImageURI] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();
    
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
                    const imageURI = fileInfo.exists ? filePath : null;
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

    useEffect(() => {
        if (imageURI) {
            const handleShare = async () => {
                try {
                    const fileInfo = await FileSystem.getInfoAsync(imageURI);
                    if (fileInfo.exists) {
                        await Sharing.shareAsync(imageURI, { dialogTitle: 'Share Image' });
                    } else {
                        console.error("File does not exist:", imageURI);
                    }
                } catch (error) {
                    console.error("Error sharing image:", error);
                }
            };

            const handleOpenLink = async () => {
                try {
                    await Linking.openURL(imageURI);
                } catch (error) {
                    console.error("Error opening link:", error);
                }
            };

            handleShare();

            // Add event listeners for share and open link actions
            return () => {
                // Cleanup event listeners if needed
            };
        }
      }, [imageURI]);

    return (
            <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
                {imageURI ? (
                    <Zoomable>
                        <Image
                            key={imageURI}
                            source={{uri: imageURI}}
                            style={{ width: 200, height: 200 }}
                        />
                    </Zoomable>
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: 'white' }}>{loading ? 'Loading...' : 'Image not available'}</Text>
                    </View>
                )}
            </SafeAreaView>
    );
}