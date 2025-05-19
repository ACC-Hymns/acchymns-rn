import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, Image, ActivityIndicator, useColorScheme, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { GestureHandlerRootView, Pressable, ScrollView } from 'react-native-gesture-handler';
import { BookSummary, SongList } from '@/constants/types';
import { getSongData, HYMNAL_FOLDER } from '@/scripts/hymnals';
import PdfPageImage from 'react-native-pdf-page-image';
import * as FileSystem from 'expo-file-system';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Canvas, Skia, Image as SkiaImage, SkImage, useCanvasRef, useImage } from "@shopify/react-native-skia";
import { convert, convertB64 } from 'react-native-pdf-to-image';
import { Colors } from '@/constants/Colors';
import { Zoomable } from '@likashefqet/react-native-image-zoom';
import ZoomableScrollView from '@/components/ZoomableScrollView';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
    BottomSheetModal,
    BottomSheetView,
    BottomSheetModalProvider,
  } from '@gorhom/bottom-sheet';
import { Picker } from '@expo/ui/swift-ui';
import { DisplayMoreMenu } from '@/components/DisplayMoreMenu';

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

    
    const scrollRef = useRef<ScrollView | null>(null);


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

    const [isPresenting, setIsPresenting] = useState(false);

    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const isModalOpenRef = useRef(false);

    const handlePress = useCallback(() => {
        if (!bottomSheetModalRef.current) return;
        
        if (isModalOpenRef.current) {
            bottomSheetModalRef.current.dismiss();
        } else {
            bottomSheetModalRef.current.present();
        }
    }, []);
    
    const handleSheetChanges = useCallback((index: number) => {
      isModalOpenRef.current = index === 0;
    }, []);

    useLayoutEffect(() => {
        if (!context) return;

        const bData = context.BOOK_DATA[params.id as string];
        setBookData(bData);
        if (!bookData) return;

        navigation.setOptions({ title: params.number, 
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
                    <TouchableOpacity onPress={handlePress}>
                        <IconSymbol
                            name="music.quarternote.3"
                            size={24}
                            color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                        />
                    </TouchableOpacity>
                    <DisplayMoreMenu bookId={params.id as string} songId={params.number as string} />
                </View>
            ) });

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

                        // read PDF file using pdf-lib
                        const pdf = await PDFDocument.load(base64Input);
                        // for each skiimage
                        const pages = pdf.getPages();

                        
                        let yOffset = 0;
                        const srcRects = [];
                        const dstRects = [];

                        for (let i = 0; i < pages.length; i++) {
                            const page = pages[i];
                            const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = page.getCropBox();
                            const img = images[i];

                            const scaleMultiplier = img.width() / cropWidth;
                            const adjustedCropX = cropX * scaleMultiplier;
                            const adjustedCropY = img.height() - (cropY + cropHeight) * scaleMultiplier;
                            const adjustedCropHeight = cropHeight * scaleMultiplier;

                            if (img) {
                                // Define source rect (from the original image)
                                const srcRect = {
                                    x: adjustedCropX,
                                    y: adjustedCropY,
                                    width: img.width(),
                                    height: adjustedCropHeight,
                                };

                                // Define destination rect (where to draw on canvas)
                                const dstRect = {
                                    x: 0,
                                    y: yOffset,
                                    width: img.width(),
                                    height: adjustedCropHeight,
                                };

                                srcRects.push(srcRect);
                                dstRects.push(dstRect);

                                // Increment Y offset for next image
                                yOffset += adjustedCropHeight;
                            }
                        }

                        // final image height
                        const totalHeight = yOffset;
                        const maxWidth = Math.max(...images.map((img) => img.width()));

                        // Create offscreen surface
                        const surface = Skia.Surface.MakeOffscreen(maxWidth, totalHeight);
                        if (!surface) {
                            console.error("Failed to create offscreen surface");
                            return;
                        }
                        const canvas = surface.getCanvas();

                        // Draw images on canvas
                        for (let i = 0; i < images.length; i++) {
                            const img = images[i];
                            const srcRect = srcRects[i];
                            const dstRect = dstRects[i];

                            if (img) {
                                // Draw only the cropped portion
                                const paint = Skia.Paint(); // Create a SkPaint instance
                                canvas.drawImageRect(img, srcRect, dstRect, paint);
                            }
                        }

                        // Draw each image stacked vertically

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
        const handleOrientationChange = () => {
            if(!imageURI) return;

            Image.getSize(imageURI, (width, height) => {
                // reset zoom scale to 1 on orientation change
                if (scrollRef.current) {
                    scrollRef.current.scrollResponderZoomTo({
                        x: 0,
                        y: 0,
                        width: width,
                        height: height,
                        animated: true,
                    });
                }
            });
        };

        const subscription = ScreenOrientation.addOrientationChangeListener(handleOrientationChange);

        return () => {
            // Lock orientation back to default on exit
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            ScreenOrientation.removeOrientationChangeListener(subscription);
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

    const [selectedIndex, setSelectedIndex] = useState(0);

    return (
        <>
            <BottomSheetModalProvider>
                {imageURI ? (
                    <ScrollView
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
                <BottomSheetModal
                    ref={bottomSheetModalRef}
                    onChange={handleSheetChanges}
                    style={styles.bottomSheet}
                >
                    <BottomSheetView style={styles.contentContainer}>
                        <Picker
                            options={['$', '$$', '$$$', '$$$$']}
                            selectedIndex={selectedIndex}
                            onOptionSelected={({ nativeEvent: { index } }) => {
                                setSelectedIndex(index);
                            }}
                        />
                    </BottomSheetView>
                </BottomSheetModal>
            </BottomSheetModalProvider>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'grey',
    },
    contentContainer: {
        flex: 1,
        padding: 36,
        alignItems: 'center',
    },
    bottomSheet: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 7,
        },
        shadowOpacity: 0.43,
        shadowRadius: 9.51,

        elevation: 15,
    }
  });
  