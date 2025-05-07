import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, Image, ActivityIndicator, useColorScheme } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { ScrollView } from 'react-native-gesture-handler';
import { BookSummary, SongList } from '@/constants/types';
import { getSongData, HYMNAL_FOLDER } from '@/scripts/hymnals';
import PdfPageImage from 'react-native-pdf-page-image';
import * as FileSystem from 'expo-file-system';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Canvas, Skia, Image as SkiaImage, SkImage, useCanvasRef, useImage } from "@shopify/react-native-skia";
import { convert, convertB64 } from 'react-native-pdf-to-image';
import { Colors } from '@/constants/Colors';


export default function DisplayScreen() {
    const params = useLocalSearchParams<{ id: string, number: string }>();
    const theme = useColorScheme() ?? 'light';
    const MIN_SCALE = 1;
    const MAX_SCALE = 5;

    const context = useContext(HymnalContext);
    const [bookData, setBookData] = useState<BookSummary | null>(null);
    const [songData, setSongData] = useState<SongList | null>(null);
    const [imageURI, setImageURI] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    async function loadSkiaImageFromUri(uri: string) {
        try {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const imageBytes = Skia.Data.fromBase64(base64);
          const image = Skia.Image.MakeImageFromEncoded(imageBytes);
          return image;
        } catch (e) {
          console.error("Error loading image:", e);
          return null;
        }
      }

    useLayoutEffect(() => {
        if (!context) return;

        const bData = context.BOOK_DATA[params.id as string];
        setBookData(bData);
        if (!bookData) return;

        navigation.setOptions({ title: params.number });

        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getSongData(params.id as string);
                setSongData(data);

                const filePath = `${FileSystem.documentDirectory}${HYMNAL_FOLDER}/${bData.name.short}/songs/${params.number}.${bData.fileExtension}`.replace(/\/\//g, '/');

                const normalizedFilePath = filePath.replace(/\\/g, '/').replace(/\/\//g, '/');

                const fileInfo = await FileSystem.getInfoAsync(normalizedFilePath);

                if (fileInfo.exists) {
                    const imageURI = fileInfo.exists ? normalizedFilePath : null;
                    // check if file is a PDF
                    if (bData.fileExtension === 'pdf') {
                        //console.log("File is a PDF, generating images...");

                        // get base64 string from file
                        const base64Input = await FileSystem.readAsStringAsync(normalizedFilePath, {
                            encoding: FileSystem.EncodingType.Base64,
                        });

                        if(!imageURI) 
                            return;

                        // start milliseconds
                        const startTime = Date.now();
                        const imageUris = await PdfPageImage.generateAllPages(`data:application/pdf;base64,${base64Input}`, 1).catch((error) => {
                            console.error("Error generating images from PDF:", error);
                        });

                        if (!imageUris || imageUris?.length === 0) {
                            console.error("No images generated from PDF");
                            return;
                        }
                        const images = (await Promise.all(imageUris.map((i) => loadSkiaImageFromUri(i.uri)))).filter((img): img is SkImage => img !== null);

                        // Measure total size
                        const totalHeight = images.reduce((acc, img) => acc + img.height(), 0);
                        const maxWidth = Math.max(...images.map((img) => img.width()));

                        // Create offscreen surface
                        const surface = Skia.Surface.MakeOffscreen(maxWidth, totalHeight);
                        if (!surface) {
                            console.error("Failed to create offscreen surface");
                            return;
                        }
                        const canvas = surface.getCanvas();

                        // Draw each image stacked vertically
                        let yOffset = 0;
                        for (const img of images) {
                            canvas.drawImage(img, 0, yOffset);
                            yOffset += img.height();
                        }

                        // Get the final image
                        const resultImage = surface.makeImageSnapshot();
                        const base64 = resultImage.encodeToBase64();
                        const dataUri = `data:image/png;base64,${base64}`;

                        // end time
                        const endTime = Date.now();
                        const duration = endTime - startTime;
                        //console.log(`Image stitching took ${duration} milliseconds`);

                        setImageURI(dataUri);
                    } else {
                        setImageURI(imageURI);
                    }

                    //console.log("Image URI:", imageURI);
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
        const [ratio, setRatio] = useState(0);
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
                    maximumZoomScale={MAX_SCALE}
                    >
                    <FullWidthPicture uri={imageURI} />
                </ScrollView>
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    {loading ? (
                        <ActivityIndicator size="large" color={Colors[theme]['text']} />
                    ) : (
                        <Text style={{ color: Colors[theme]['text'] }}>Image not available</Text>
                    )}
                </View>
            )}
        </>
    );
}
