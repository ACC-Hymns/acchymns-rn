import GradientButton from '@/components/GradientButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { BookSummary } from '@/constants/types';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { loadHymnals, removeHymnal } from '@/scripts/hymnals';
import { useRouter } from 'expo-router';
import { use, useContext, useEffect, useState } from 'react';
import { Text, View, StyleSheet, Platform, ScrollView, TouchableOpacity, SafeAreaView, FlatList } from 'react-native';
import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator,
} from "react-native-draggable-flatlist";
import { Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
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

        const books = context.BOOK_DATA;
        setBookData(books);
    }, [context?.BOOK_DATA]);


    const renderHymnalItem = ({ item: bookKey , drag, isActive}: RenderItemParams<string>) => {
        return (
            <ScaleDecorator>
                <View style={{ marginBottom: 15 }}>
                    <ContextMenu.Root key={bookKey}>
                        <ContextMenu.Trigger>
                            <TouchableOpacity activeOpacity={1}>
                                <GradientButton
                                    key={bookKey}
                                    title={bookData![bookKey].name.medium}
                                    primaryColor={bookData![bookKey].primaryColor}
                                    secondaryColor={bookData![bookKey].secondaryColor}
                                    onPress={() => {
                                        router.push({ pathname: '/home/selection/[id]', params: { id: bookKey } });
                                    }}
                                    onLongPress={drag}
                                />
                            </TouchableOpacity>
                        </ContextMenu.Trigger>
                        <ContextMenu.Content>
                            <ContextMenu.Item key='1' destructive={true} textValue='Remove Hymnal' onSelect={async () => {
                                    console.log('Remove hymnal pressed');

                                    // remove hymnal from context
                                    await removeHymnal(bookKey);

                                    const books = await loadHymnals();
                                    context?.SET_BOOK_DATA(books);
                                }}>
                                <ContextMenu.ItemTitle>
                                    <Text style={{ color: 'red' }}>Delete</Text>
                                </ContextMenu.ItemTitle>
                                <ContextMenu.ItemIcon ios={{ name: 'trash'}} />
                            </ContextMenu.Item>
                        </ContextMenu.Content>
                    </ContextMenu.Root>
                </View>
            </ScaleDecorator>
        )
    }


    return (
        <>
            <GestureHandlerRootView>
                <DraggableFlatList
                    style={[styles.scrollView, { flex: 1 }]}
                    contentContainerStyle={{ paddingBottom: 90 }}
                    data={bookData ? Object.keys(bookData) : []}
                    keyExtractor={(bookKey) => bookKey}
                    onDragEnd={({ data }) => {
                        const newBookData: Record<string, BookSummary> = {};
                        data.forEach((bookKey, index) => {
                            newBookData[bookKey] = bookData![bookKey];
                        });
                        setBookData(newBookData);
                        context?.SET_BOOK_DATA(newBookData);
                    }}

                    renderItem={renderHymnalItem}
                    ListHeaderComponent={
                        <View style={styles.titleContainer}>
                            <Text style={styles.textStyle}>Home</Text>
                        </View>
                    }
                    ListFooterComponent={
                        <View style={{ alignItems: 'center', marginTop: 20 }}>
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
        scrollView: {
            flex: 1,
            width: '100%',
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