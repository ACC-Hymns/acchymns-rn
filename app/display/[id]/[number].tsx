import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Image, Text, ActivityIndicator, useColorScheme, TouchableOpacity, StyleSheet } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { HymnalContext } from '@/constants/context';
import { GestureHandlerRootView, Pressable, ScrollView } from 'react-native-gesture-handler';
import { BookSummary, SongList } from '@/constants/types';
import { getSongData, HYMNAL_FOLDER } from '@/scripts/hymnals';
import PdfPageImage from 'react-native-pdf-page-image';
import * as FileSystem from 'expo-file-system';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Canvas, Skia, Image as SkiaImage, SkImage, useCanvasRef, useImage } from "@shopify/react-native-skia";
import * as Haptics from 'expo-haptics';
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
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { DisplayMoreMenu } from '@/components/DisplayMoreMenu';
import NoteButton from '@/components/NoteButton';
import { getNoteMp3, Note, notePngs, trebleNotePngs } from '@/constants/assets';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

export default function DisplayScreen() {
    const params = useLocalSearchParams<{ id: string, number: string }>();
    const theme = useColorScheme() ?? 'light';
    const MIN_SCALE = 1;
    const MAX_SCALE = 5;

    const context = useContext(HymnalContext);
    const [bookData, setBookData] = useState<BookSummary | null>(null);
    const [songData, setSongData] = useState<SongList | null>(null);
    const [songNotes, setSongNotes] = useState<string[]>([]);
    const [imageData, setImageData] = useState<{ uri: string, aspectRatio: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const audioPlayers = useRef<AudioPlayer[]>([]);
    const navigation = useNavigation();
    const styles = makeStyles(theme);

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
    }, [bookData, params.id, navigation]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getSongData(params.id as string);
                setSongData(data);

                // set song notes
                const songNotes = data?.[params.number]?.notes;
                // reverse notes
                const reversedNotes = songNotes?.slice().reverse();
                setSongNotes(reversedNotes || []);
                for(const note of reversedNotes || []) {
                    const assetId = getNoteMp3(note);
                    console.log("Loading asset:", assetId);
                    const player = createAudioPlayer(assetId);
                    audioPlayers.current.push(player);
                }

                

                navigation.setOptions({ title: params.number, 
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
                            {songNotes && songNotes.length > 0 && (
                                <TouchableOpacity onPress={handlePress}>
                                    <IconSymbol
                                        name="music.note"
                                        size={24}
                                        color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                                    />
                                </TouchableOpacity>
                            )}
                            <DisplayMoreMenu bookId={params.id as string} songId={params.number as string} />
                        </View>
                    ) 
                });

                await setAudioModeAsync({
                    playsInSilentMode: true,
                    interruptionMode: 'mixWithOthers',
                    interruptionModeAndroid: 'duckOthers'
                })


                if(!bookData) return;

                const filePath = `${FileSystem.documentDirectory}${HYMNAL_FOLDER}/${bookData.name.short}/songs/${params.number}.${bookData.fileExtension}`.replace(/\/\//g, '/');

                const normalizedFilePath = filePath.replace(/\\/g, '/').replace(/\/\//g, '/');

                const fileInfo = await FileSystem.getInfoAsync(normalizedFilePath);

                if (fileInfo.exists) {
                    const imageURI = fileInfo.exists ? normalizedFilePath : null;
                    // check if file is a PDF
                    if (bookData.fileExtension === 'pdf') {
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

                        Image.getSize(dataUri, (width, height) => {
                            setImageData({
                                uri: dataUri,
                                aspectRatio: width / height,
                            });
                        });
                    } else {
                        if (imageURI) {
                            Image.getSize(imageURI, (width, height) => {
                                setImageData({
                                    uri: imageURI,
                                    aspectRatio: width / height,
                                });
                            });
                        }
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

        // Unlock orientation on page load
        ScreenOrientation.unlockAsync();
        const handleOrientationChange = () => {
            if(!imageData) return;

            Image.getSize(imageData.uri, (width, height) => {
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
    }, [bookData]);



    const [selectedIndex, setSelectedIndex] = useState<number>(0);

    function getClef(note: string) {
        const modified_note = note.replace("#", "").replace("b", "");
        if (songNotes.indexOf(note) > 1 || !Object.keys(notePngs).includes(modified_note)) {
            return 'treble'
        }
        return 'bass';
    }

    const DELAY = 200;
    function playAllNotes() {
        for (const [index, note] of songNotes.entries()) {
            const timeout = setTimeout(() => {
                const player = audioPlayers.current[index];
                if (player) {
                    player.seekTo(0);
                    player.play();
                }
            }, index * DELAY);
        }
    }

    function playNote(note: string) {
        const id = songNotes.indexOf(note);
        if (id < 0) return;
        const player = audioPlayers.current[id];
        if (player) {
            player.seekTo(0);
            player.play();
        }
    }

    return (
        <>
            {imageData ? (
            <ScrollView
                minimumZoomScale={1}
                maximumZoomScale={5}
                contentContainerStyle={{ flexGrow: 1 }}
            >
                <Image
                source={{ uri: imageData.uri }}
                resizeMode="contain"
                style={{
                    width: '100%',
                    height: undefined,
                    aspectRatio: imageData.aspectRatio,
                }}
                />
            </ScrollView>
            ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
            )}
            <BottomSheetModalProvider>
                <BottomSheetModal
                    ref={bottomSheetModalRef}
                    onChange={handleSheetChanges}
                    style={styles.bottomSheet}
                    backgroundStyle={styles.bottomSheet}
                    handleIndicatorStyle={styles.handleIndicator}
                >
                    <BottomSheetView style={styles.contentContainer}>
                        <SegmentedControl
                            style={{
                                width: 300,
                                height: 32,
                            }}
                            selectedIndex={selectedIndex}
                            values={['Notes', 'Piano', 'Details']}
                            onChange={(event) => {
                                setSelectedIndex(event.nativeEvent.selectedSegmentIndex);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                        />
                        {selectedIndex === 0 && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                flexWrap: 'wrap',
                                marginVertical: 16,
                            }}>
                                {songData && songData[params.number] && (
                                <>
                                    <View style={styles.noteButton}>
                                        <NoteButton note={"" as Note} clef={'none'} onClick={() => playAllNotes()} />
                                        <Text style={{fontSize: 18, color: Colors[theme].text}}>All</Text>
                                    </View>
                                    {songNotes.map((note, index) => (
                                    <View key={index} style={styles.noteButton}>
                                        <NoteButton note={note as Note} clef={getClef(note)} onClick={() => playNote(note)} />
                                        <Text style={{fontSize: 18, color: Colors[theme].text}}>{note}</Text>
                                    </View>
                                    ))}
                                </>
                                )}
                            </View>
                        )}
                        
                    </BottomSheetView>
                </BottomSheetModal>
            </BottomSheetModalProvider>
        </>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        noteButton: {
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
        },
        handleIndicator: {
            backgroundColor: Colors[theme]['border'],
        },
        container: {
            flex: 1,
            backgroundColor: 'grey',
        },
        contentContainer: {
            flex: 1,
            padding: 8,
            paddingBottom: 50,
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
            backgroundColor: Colors[theme]['background'],
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
        }
    });
}    