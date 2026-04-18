import GradientButton from '@/components/GradientButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { BookSummary } from '@/constants/types';
import { useColorScheme } from '@/hooks/useColorScheme';
import { loadHymnals, removeHymnal } from '@/scripts/hymnals';
import { useRouter } from 'expo-router';
import { useCallback, useContext, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { useI18n } from '@/hooks/useI18n';
import StyledText from '@/components/StyledText';
import type { SortableGridRenderItem } from 'react-native-sortables';
import Sortable from 'react-native-sortables';
import { scheduleOnRN } from 'react-native-worklets';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { Animated as RNAnimated } from 'react-native';

export default function HomeScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const context = useContext(HymnalContext);
    const router = useRouter();

    const i18n = useI18n();

    // before rendering, check if the user has any books
    // if not, push the user to the hymnal importer


    const [sortOrder, setSortOrder] = useState<string[]>([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
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
                setSortOrder(data);
            } else if (context?.BOOK_DATA) {
                // If no saved order, initialize with current book data keys
                const initialOrder = Object.keys(context.BOOK_DATA);
                setSortOrder(initialOrder);
            } else {
                console.log("bookData is null");
            }
            setIsInitialLoad(false);
        } catch (error) {
            console.error("Error loading sort order:", error);
            if (context?.BOOK_DATA) {
                const initialOrder = Object.keys(context.BOOK_DATA);
                setSortOrder(initialOrder);
            }
            setIsInitialLoad(false);
        }
    };
    useEffect(() => {
        const loadInitialData = async () => {
            await loadOrder();
        };
        loadInitialData();
    }, [context?.BOOK_DATA]);

    // Update sortOrder when BOOK_DATA changes to remove deleted items
    useEffect(() => {
        if (!context?.BOOK_DATA || sortOrder.length === 0 || isInitialLoad) return;

        // Filter out any items in sortOrder that no longer exist in BOOK_DATA
        const validSortOrder = sortOrder.filter((key) => context?.BOOK_DATA[key]);

        // If the order changed, update it
        if (validSortOrder.length !== sortOrder.length) {
            setSortOrder(validSortOrder);
        }
    }, [context?.BOOK_DATA, isInitialLoad]);

    useEffect(() => {
        const save = async () => {
            await saveOrder(sortOrder)
        }
        save();
    }, [sortOrder])


    const HymnalItem: React.FC<{ item: string }> = ({ item }) => {

        if (!context?.BOOK_DATA?.[item]) {
            return null;
        }

        return (
            <View style={{ marginBottom: 15 }}>
                <GradientButton
                    onPress={() => router.push(`/selection/${item}`)}
                    key={item}
                    title={context?.BOOK_DATA?.[item].name.medium || ""}
                    primaryColor={context?.BOOK_DATA?.[item].primaryColor || ""}
                    secondaryColor={context?.BOOK_DATA?.[item].secondaryColor || ""}
                />
            </View>
        )
    };

    const renderItem = useCallback<SortableGridRenderItem<string>>(
        ({ item }) => (
            <HymnalItem item={item} />
        ),
        [context?.BOOK_DATA, router]
    );

    // Filter and memoize the data to only include items that exist in BOOK_DATA
    const gridData = useMemo(() => {
        if (!context?.BOOK_DATA || sortOrder.length === 0) {
            return [];
        }
        return sortOrder.filter((key) => context?.BOOK_DATA[key]);
    }, [sortOrder, context?.BOOK_DATA]);

    function haptic() {
        'worklet';
        scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
    }

    const scrollableRef = useAnimatedRef<Animated.ScrollView>();

    // Loading skeleton animation
    const skeletonOpacity = React.useRef(new RNAnimated.Value(0.3)).current;

    React.useEffect(() => {
        if (isInitialLoad) {
            const pulseAnimation = RNAnimated.loop(
                RNAnimated.sequence([
                    RNAnimated.timing(skeletonOpacity, {
                        toValue: 0.6,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    RNAnimated.timing(skeletonOpacity, {
                        toValue: 0.3,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulseAnimation.start();
            return () => pulseAnimation.stop();
        }
    }, [isInitialLoad]);


    return (
        <View style={{ flex: 1 }} onLayout={() => context?.onLayoutHomeView()}>
            <Animated.ScrollView
                style={styles.scrollView}
                contentInsetAdjustmentBehavior='always'
                ref={scrollableRef}
            >
                <View style={styles.titleContainer}>
                    <StyledText style={styles.textStyle}>{i18n.t('home')}</StyledText>
                </View>
                {isInitialLoad ? (
                    <View>
                        {[1, 2, 3, 4].map((index) => (
                            <RNAnimated.View
                                key={index}
                                style={[
                                    styles.skeletonItem,
                                    {
                                        opacity: skeletonOpacity,
                                        backgroundColor: theme === 'light' ? '#E3E3E9' : '#1C1C1E',
                                    }
                                ]}
                            />
                        ))}
                    </View>
                ) : gridData.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 20 }}>
                        <StyledText style={styles.fadedText}>{i18n.t('noHymnals')}</StyledText>
                        <View style={{ height: 5 }} />
                        <StyledText style={styles.descriptionText}>{i18n.t('addHymnalSubtitle')}</StyledText>
                    </View>
                ) : (
                    <Sortable.Grid
                        columns={1}
                        data={gridData}
                        keyExtractor={(item: string) => item}
                        renderItem={renderItem}
                        activeItemOpacity={1}
                        inactiveItemOpacity={1}
                        scrollableRef={scrollableRef}
                        enableActiveItemSnap={false}
                        onOrderChange={haptic}
                        onDragStart={haptic}
                        onDragEnd={({ data }) => {
                            setSortOrder(data);
                        }}
                    />
                )}
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
            </Animated.ScrollView>


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
        },
        skeletonItem: {
            height: 110,
            borderRadius: 16,
            marginBottom: 15,
        }
    });

};