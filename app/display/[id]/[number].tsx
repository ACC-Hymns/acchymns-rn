import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { ScrollView } from 'react-native-gesture-handler';
import { BookSummary, SongList } from '@/constants/types';
import { getSongData, HYMNAL_FOLDER } from '@/scripts/hymnals';
import * as FileSystem from 'expo-file-system';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function DisplayScreen() {
    const params = useLocalSearchParams<{ id: string, number: string }>();
    const MIN_SCALE = 1;
    const MAX_SCALE = 5;

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

    useEffect(() => {
        // Unlock orientation on page load
        ScreenOrientation.unlockAsync();

        return () => {
            // Lock orientation back to default on exit
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        };
    }, []);

    const FullWidthPicture: React.FC<{ uri: string }> = ({ uri }) => {
        const [ratio, setRatio] = useState(1);
        useEffect(() => {
            if (uri) {
                Image.getSize(uri, (width, height) => {
                    setRatio(width / height);
                });
            }
        }, [uri]);

        return (
            <Image
                style={{ width: '100%', height: undefined, aspectRatio: ratio }}
                resizeMode="contain"
                source={{ uri }}
            />
        );
    };

    return (
        <>
            {imageURI ? (
                <ScrollView
                    style={{ flex: 1 }}
                    minimumZoomScale={MIN_SCALE}
                    maximumZoomScale={MAX_SCALE}>
                    <FullWidthPicture uri={imageURI} />
                </ScrollView>
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: 'white' }}>{loading ? 'Loading...' : 'Image not available'}</Text>
                </View>
            )}
        </>
    );
}
