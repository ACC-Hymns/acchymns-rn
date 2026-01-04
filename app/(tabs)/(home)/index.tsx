import GradientButton from '@/components/GradientButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { BookSummary } from '@/constants/types';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import * as FileSystem from 'expo-file-system';
import { hashFile, hashFolder } from '@/scripts/hash';
import { loadHymnals, removeHymnal } from '@/scripts/hymnals';
import { useNavigation, useRouter } from 'expo-router';
import { memo, use, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, InteractionManager, Alert, Dimensions, ListRenderItemInfo, Platform, ScrollView } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import SwipeableItem, { SwipeableItemImperativeRef, useSwipeableItemParams } from 'react-native-swipeable-item';
import { GestureHandlerRootView, Pressable } from 'react-native-gesture-handler';
import * as ContextMenu from 'zeego/context-menu';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon } from 'react-native-elements';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { useI18n } from '@/hooks/useI18n';
import StyledText from '@/components/StyledText';
import ReorderableList, {
    ReorderableListReorderEvent,
    reorderItems,
    useIsActive,
    useReorderableDrag,
    useReorderableDragEnd,
    useReorderableDragStart,
} from 'react-native-reorderable-list';
import type { SortableGridRenderItem } from 'react-native-sortables';
import Sortable from 'react-native-sortables';
import { Ionicons } from '@expo/vector-icons';
import { scheduleOnRN } from 'react-native-worklets';

export default function HomeScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const context = useContext(HymnalContext);
    const router = useRouter();

    const i18n = useI18n();

    // before rendering, check if the user has any books
    // if not, push the user to the hymnal importer

    // 1. Wrap in useCallback to prevent unnecessary re-attachments
    const deleteHymnal = useCallback(async (bookKey: string) => {
        console.log(`Deleting ${bookKey}...`);

        try {
            // Run deletions
            await removeHymnal(bookKey);

            // Batch state updates:
            // Update progress and book data simultaneously
            context?.setDownloadProgressValues((prev) => {
                const { [bookKey]: _, ...rest } = prev; // Clean way to delete key
                return rest;
            });

            // Reload the master list
            const updatedBooks = await loadHymnals();
            context?.SET_BOOK_DATA(updatedBooks);

            console.log("Hymnal deleted and state reloaded.");
        } catch (error) {
            console.error("Failed to delete hymnal:", error);
        }
    }, [context?.setDownloadProgressValues, context?.SET_BOOK_DATA, context?.BOOK_DATA]);
    // Use specific context functions as deps, not the whole data object

    useEffect(() => {
        if (!context) return;

        // Only assign if it's actually different
        if (context.deleteHymnal !== deleteHymnal) {
            context.deleteHymnal = deleteHymnal;
        }

        loadOrder();
    }, [deleteHymnal]); // Runs when the function reference changes

    const [sortOrder, setSortOrder] = useState<string[]>([]);
    const HYMNAL_SORT_KEY = 'hymnal_sort_order';
    const saveOrder = async (order: string[]) => {
        try {
            await AsyncStorage.setItem(HYMNAL_SORT_KEY, JSON.stringify(order));
        } catch (error) {
            console.error("Error saving sort order:", error);
        }
    };
    const loadOrder = async () => {
        try {
            console.log("Loading order...")
            const order = await AsyncStorage.getItem(HYMNAL_SORT_KEY);
            if (order !== null && context?.BOOK_DATA) {
                let order_data: string[] = JSON.parse(order);
                order_data = [...new Set(order_data)]
                console.log("Book order: " + order);
                if (order_data.some(el => el == null)) {
                    order_data = Object.keys(context.BOOK_DATA).map((b) => context.BOOK_DATA[b].name.short);
                    await saveOrder(order_data);
                }
                let data = [
                    // First, keys in sortOrder that exist in bookData
                    ...order_data.filter((key) => context?.BOOK_DATA[key]),
                    // Then, any keys in bookData not in sortOrder
                    ...Object.keys(context?.BOOK_DATA).filter((key) => !order_data.includes(key))
                ]
                console.log(data)
                setSortOrder(data);
            } else {
                console.log("bookData is null");
            }
        } catch (error) {
            console.error("Error loading sort order:", error);
        }
    };
    useEffect(() => {
        const loadInitialData = async () => {
            await loadOrder();
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        const save = async () => {
            await saveOrder(sortOrder)
        }
        save();
    }, [sortOrder])


    const HymnalItem: React.FC<{ item: string }> = memo(({ item }) => {

        return (
            <View style={{ marginBottom: 15 }}>
                <GradientButton
                    key={item}
                    title={context?.BOOK_DATA?.[item].name.medium || ""}
                    primaryColor={context?.BOOK_DATA?.[item].primaryColor || ""}
                    secondaryColor={context?.BOOK_DATA?.[item].secondaryColor || ""}
                />
            </View>
        )
    });

    const renderItem = useCallback<SortableGridRenderItem<string>>(
        ({ item }) => (
            <HymnalItem item={item} />
        ),
        []
    );

    function haptic() {
        'worklet';
        scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
    }
    return (
        <View style={{ flex: 1 }} onLayout={() => context?.onLayoutHomeView()}>
            <ScrollView
                style={styles.scrollView}
                contentInsetAdjustmentBehavior='always'
            >
                <View style={styles.titleContainer}>
                    <StyledText style={styles.textStyle}>{i18n.t('home')}</StyledText>
                </View>
                <Sortable.Grid
                    columns={1}
                    data={context?.BOOK_DATA
                        ? [
                            // First, keys in sortOrder that exist in bookData
                            ...sortOrder.filter((key) => context?.BOOK_DATA[key]),
                            // Then, any keys in bookData not in sortOrder
                            ...Object.keys(context?.BOOK_DATA).filter((key) => !sortOrder.includes(key))
                        ]
                        : []} // Pass your data here
                    renderItem={renderItem}
                    rowGap={5}
                    columnGap={5}
                    activeItemOpacity={1}
                    inactiveItemOpacity={1}
                    enableActiveItemSnap={false}
                    onOrderChange={haptic}
                />
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
            </ScrollView>
            {/* <ReorderableList
                    autoscrollSpeedScale={0}
                    shouldUpdateActiveItem={true}
                    style={[styles.scrollView]}
                    cellAnimations={{opacity: 1}}
                    contentContainerStyle={{ paddingBottom: 90 }}
                    data={
                        context?.BOOK_DATA
                            ? [
                                // First, keys in sortOrder that exist in bookData
                                ...sortOrder.filter((key) => context?.BOOK_DATA[key]),
                                // Then, any keys in bookData not in sortOrder
                                ...Object.keys(context?.BOOK_DATA).filter((key) => !sortOrder.includes(key))
                            ]
                            : []
                    }
                    keyExtractor={(item: string) => item}
                    onReorder={({ from, to }: ReorderableListReorderEvent) => {
                        setSortOrder(value => reorderItems(value, from, to));
                    }}
                    onIndexChange={haptic}
                    onDragStart={haptic}
                    renderItem={renderItem}
                    ListHeaderComponent={
                        <View style={styles.titleContainer}>
                            <StyledText style={styles.textStyle}>{i18n.t('home')}</StyledText>
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
                            <StyledText style={styles.fadedText}>{i18n.t('noHymnals')}</StyledText>
                            <View style={{ height: 5 }} />
                            <StyledText style={styles.descriptionText}>{i18n.t('addHymnal')}</StyledText>
                        </View>
                    }
                /> */}

        </View>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        deleteButtonContainer: {
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 100,
            alignItems: 'center',
            justifyContent: 'center',
        },
        deleteButton: {
            backgroundColor: '#fd3b31',
            width: 100,
            height: '100%',
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },
        rowItem: {
            height: 100,
            width: 100,
            alignItems: "center",
            justifyContent: "center",
        },
        text: {
            color: "white",
            fontSize: 24,
            fontWeight: 700,
            textAlign: "center",
        },
        scrollView: {
            flex: 1,
            width: '100%',
            paddingTop: 15,
            paddingBottom: 15,
            paddingRight: 20,
            paddingLeft: 20,
            backgroundColor: Colors[theme].background
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
            fontWeight: 700,
            fontFamily: 'Lato'
        },
        screenContainer: {
            flex: 1, // Ensures the container takes up the full screen
            backgroundColor: Colors[theme]['background'] // Dynamically set background color using useThemeColor
        },
        titleContainer: {
            marginTop: 18,
            marginBottom: 20,
            marginHorizontal: 10,
            flexDirection: 'row',
            justifyContent: 'space-between'
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
            fontWeight: '700',
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