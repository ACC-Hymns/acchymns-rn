import GradientButton from '@/components/GradientButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { BookSummary } from '@/constants/types';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import FileSystem from 'expo-file-system';
import { hashFolder } from '@/scripts/hash';
import { loadHymnals, removeHymnal } from '@/scripts/hymnals';
import { useNavigation, useRouter } from 'expo-router';
import { use, useContext, useEffect, useState } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView, Pressable } from 'react-native-gesture-handler';
import * as ContextMenu from 'zeego/context-menu';

export default function HomeScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const context = useContext(HymnalContext);
    const router = useRouter();

    const [bookData, setBookData] = useState<Record<string, BookSummary> | null>(null);

    // before rendering, check if the user has any books
    // if not, push the user to the hymnal importer

    useEffect(() => {
        if(!context)
            return;

        context.deleteHymnal = deleteHymnal;

        const books = context.BOOK_DATA;
        setBookData(books);
    }, [context?.BOOK_DATA]);

    async function deleteHymnal(bookKey: string) {
        // remove hymnal from context
        await removeHymnal(bookKey);

        // remove progress values
        context?.setDownloadProgressValues((prev) => {
            const newValues = { ...prev };
            delete newValues[bookKey];
            return newValues;
        });

        const books = await loadHymnals();
        context?.SET_BOOK_DATA(books);
    }

    async function checkHash(bookId: string) {
        console.log('Checking hash for book:', bookId);
        if(bookData && bookData[bookId]) {
            let hash = await hashFolder(FileSystem.documentDirectory + 'hymnals/' + bookId);
            console.log(hash);
        }
    }

    const renderHymnalItem = ({ item: bookKey }: { item: string }) => {
        return (
            <View style={{ marginBottom: 15 }}>
                <ContextMenu.Root key={bookKey}>
                    <ContextMenu.Trigger>
                        <Pressable
                        unstable_pressDelay={0}
                        onPress={() => {
                            checkHash(bookKey);
                            router.push({ pathname: '/(tabs)/(home)/selection/[id]', params: { id: bookKey } });
                        }}
                        style={({ pressed }) => [
                            {
                                opacity: pressed ? 0.7 : 1,
                            },
                        ]}
                        >
                            <GradientButton
                                key={bookKey}
                                title={bookData![bookKey].name.medium}
                                primaryColor={bookData![bookKey].primaryColor}
                                secondaryColor={bookData![bookKey].secondaryColor}
                                //onLongPress={drag}
                            />
                        </Pressable>
                    </ContextMenu.Trigger>
                    <ContextMenu.Content>
                        <ContextMenu.Item key='1' destructive={true} textValue='Remove Hymnal' onSelect={async () => {
                                deleteHymnal(bookKey);
                            }}>
                            <ContextMenu.ItemTitle>
                                <Text style={{ color: 'red' }}>Delete</Text>
                            </ContextMenu.ItemTitle>
                            <ContextMenu.ItemIcon ios={{ name: 'trash'}} />
                        </ContextMenu.Item>
                    </ContextMenu.Content>
                </ContextMenu.Root>
            </View>
        )
    }

    const renderDraggableHymnalItem = ({ item: bookKey , drag, isActive}: RenderItemParams<string>) => {
        return renderHymnalItem({ item: bookKey });
    }

    return (
        <>
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors[theme]['background'] }} onLayout={() => context?.onLayoutHomeView()}>
                <FlatList
                style={[styles.scrollView]}
                contentContainerStyle={{ paddingBottom: 90 }}
                data={bookData ? Object.keys(bookData) : []}
                keyExtractor={(bookKey) => bookKey}
                // onDragEnd={({ data }) => {
                //     const newBookData: Record<string, BookSummary> = {};
                //     data.forEach((bookKey, index) => {
                //         newBookData[bookKey] = bookData![bookKey];
                //     });
                //     setBookData(newBookData);
                //     context?.SET_BOOK_DATA(newBookData);
                // }}

                renderItem={renderHymnalItem}
                ListHeaderComponent={
                    <View style={styles.titleContainer}>
                        <Text style={styles.textStyle}>Home</Text>
                    </View>
                }
                ListFooterComponent={
                    <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 30 }}>
                        <TouchableOpacity
                            onPress={() => router.push('/hymnal_importer')}
                        >
                            <IconSymbol
                                name="plus.circle"
                                size={56}
                                weight='light'
                                color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                            />
                        </TouchableOpacity>
                    </View>
                }
                ListEmptyComponent={
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 20 }}>
                        <Text style={styles.fadedText}>No Hymnals</Text>
                        <View style={{ height: 5 }} />
                        <Text style={styles.descriptionText}>To add a hymnal, tap the "+" button below.</Text>
                    </View>
                }
            />
            </GestureHandlerRootView>
        </>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        rowItem: {
          height: 100,
          width: 100,
          alignItems: "center",
          justifyContent: "center",
        },
        text: {
          color: "white",
          fontSize: 24,
          fontWeight: "bold",
          textAlign: "center",
        },
        scrollView: {
            paddingTop: 15,
            paddingBottom: 15,
            paddingRight: 20,
            paddingLeft: 20,
        },
        button: {
            paddingVertical: 20,
            borderRadius: 16,
            marginBottom: 15,
            paddingHorizontal: 20,
            justifyContent: 'center',
        },
        buttonText: {
            color: 'white',
            fontSize: 24,
            fontWeight: 'bold',
            fontFamily: 'Lato'
        },
        screenContainer: {
            flex: 1, // Ensures the container takes up the full screen
            backgroundColor: Colors[theme]['background'] // Dynamically set background color using useThemeColor
        },
        titleContainer: {
            marginTop: 80,
            marginBottom: 20,
            marginLeft: 10,
        },
        stepContainer: {
            gap: 8,
            marginBottom: 8
        },
        reactLogo: {
            height: 178,
            width: 290,
            bottom: 0,
            left: 0,
            position: 'absolute'
        },
        textStyle: {
            fontSize: 32,
            fontWeight: '500',
            color: Colors[theme]['text'], // Dynamically set text color using useThemeColor
            fontFamily: 'Lato'
        },
        fadedText: {
            fontSize: 24,
            fontWeight: '500',
            color: Colors[theme]['fadedText'], // Dynamically set text color using useThemeColor
            fontFamily: 'Lato'
        },
        descriptionText: {
            fontSize: 16,
            fontWeight: '400',
            color: Colors[theme]['fadedText'], // Dynamically set text color using useThemeColor
            fontFamily: 'Lato',
            textAlign: 'center'
        }
    });

};