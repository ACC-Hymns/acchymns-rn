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
import { use, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, InteractionManager, Alert, Dimensions } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import SwipeableItem, { SwipeableItemImperativeRef, useSwipeableItemParams } from 'react-native-swipeable-item';
import { GestureHandlerRootView, Pressable } from 'react-native-gesture-handler';
import * as ContextMenu from 'zeego/context-menu';
import { ContextMenuView } from 'react-native-ios-context-menu';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon } from 'react-native-elements';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js'
import React from 'react';

export default function HomeScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const context = useContext(HymnalContext);
    const router = useRouter();

    const [bookData, setBookData] = useState<Record<string, BookSummary> | null>(null);

    const translations = {
        en: {
            home: 'Home',
            noHymnals: 'No Hymnals',
            addHymnal: 'Add Hymnal',
            deleteAlertTitle: 'Delete ',
            deleteAlertMessage: 'You can always download the hymnal again later.',
            cancel: 'Cancel',
            delete: 'Delete',
        },
        es: {
            home: 'Inicio',
            noHymnals: 'No hay Himnarios',
            addHymnal: 'Agregar Himnarios',
            deleteAlertTitle: 'Borrar ',
            deleteAlertMessage: 'Siempre puedes descargar el himnario de nuevo más tarde.',
            cancel: 'Cancelar',
            delete: 'Borrar',
        },
        fr: {
            home: 'Accueil',
            noHymnals: 'Aucun Livre de Hymnes',
            addHymnal: 'Ajouter un Livre de Hymnes',
            deleteAlertTitle: 'Supprimer ',
            deleteAlertMessage: 'Vous pouvez toujours télécharger le livre de hymnes plus tard.',
            cancel: 'Annuler',
            delete: 'Supprimer',
        },
        de: {
            home: 'Startseite',
            noHymnals: 'Keine Gesangbücher',
            addHymnal: 'Gesangbuch hinzufügen',
            deleteAlertTitle: 'Löschen ',
            deleteAlertMessage: 'Sie können das Gesangbuch später jederzeit erneut herunterladen.',
            cancel: 'Stornieren',
            delete: 'Löschen',
        },
        ja: {
            home: 'ホーム',
            noHymnals: '賛美歌集なし',
            addHymnal: '賛美歌集を追加',
            deleteAlertTitle: '削除 ',
            deleteAlertMessage: '賛美歌集はいつでも再ダウンロードできます。',
            cancel: 'キャンセル',
            delete: '削除',
        },
        pt: {
            home: 'Início',
            noHymnals: 'Sem hinários',
            addHymnal: 'Adicionar Hinário',
            deleteAlertTitle: 'Deletar ',
            deleteAlertMessage: 'Você pode sempre baixar o hinário novamente mais tarde.',
            cancel: 'Cancelar',
            delete: 'Deletar',
        },
        sr: {
            home: 'Почетна',
            noHymnals: 'Нема химнала',
            addHymnal: 'Додајте химнала',
            deleteAlertTitle: 'Обриши ',
            deleteAlertMessage: 'Можете у любом тренутку поново преузети гимнолог.',
            cancel: 'Откажи',
            delete: 'Обриши',
        }
    }
    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = getLocales()[0].languageCode ?? 'en';

    // before rendering, check if the user has any books
    // if not, push the user to the hymnal importer

    useEffect(() => {
        if(!context)
            return;

        context.deleteHymnal = deleteHymnal;

        const loadInitialData = async () => {
            await loadOrder();
        };
        loadInitialData();

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
            const order = await AsyncStorage.getItem(HYMNAL_SORT_KEY);
            if (order !== null) {
                setSortOrder(JSON.parse(order));
            }
        } catch (error) {
            console.error("Error loading sort order:", error);
        }
    };
    
    const UnderlayRight = () => {
        const { close, percentOpen, item } = useSwipeableItemParams<string>();
        const animatedStyles = useAnimatedStyle(() => ({
            transform: [{ translateX: (1 - (percentOpen.value)) * 100 }],
            opacity: percentOpen.value,
        }));
        return (
            <Animated.View style={[styles.deleteButtonContainer,animatedStyles]}>
                <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => {
                        Alert.alert(`${i18n.t('deleteAlertTitle')}"${bookData![item].name.medium}"`, i18n.t('deleteAlertMessage'), [
                            {
                                text: i18n.t('cancel'),
                                onPress: () => {
                                    close();
                                },
                                style: 'cancel',
                                isPreferred: true
                            },
                            {
                                text: i18n.t('delete'),
                                onPress: () => {
                                    close();
                                    deleteHymnal(item);
                                },
                                style: 'destructive'
                            },
                        ]);
                    }}
                    style={[styles.deleteButton]}
                >
                    <IconSymbol
                        name="trash"
                        size={24}
                        weight='light'
                        color='white' />
                </TouchableOpacity>
            </Animated.View>
        );
    };
    
    
    const renderDraggableHymnalItem = useMemo(() => {
        return ({ item: bookKey, drag, isActive }: RenderItemParams<string>) => (
            <View style={{ marginBottom: 15 }}>
                <SwipeableItem
                    item={bookKey}
                    key={bookKey}
                    renderUnderlayLeft={() => <UnderlayRight />}
                    snapPointsLeft={[115]}
                    swipeEnabled={!isActive}
                >
                    <ScaleDecorator activeScale={1.05}>
                        <Pressable
                            onPress={() => {
                                router.push({ pathname: '/(tabs)/(home)/selection/[id]', params: { id: bookKey } });
                            }}
                            onLongPress={drag}
                            disabled={isActive}
                            style={({ pressed }) => [
                                {
                                    opacity: (pressed) ? 0.8 : 1,
                                }
                            ]}
                            unstable_pressDelay={0}
                        >
                            <GradientButton
                                key={bookKey}
                                title={bookData![bookKey].name.medium}
                                primaryColor={bookData![bookKey].primaryColor}
                                secondaryColor={bookData![bookKey].secondaryColor}
                            />
                        </Pressable>
                    </ScaleDecorator>
                </SwipeableItem>
            </View>
        );
    // Add dependencies as needed
    }, [bookData, router]);

    return (
        <>
            <View style={{ flex: 1, backgroundColor: Colors[theme]['background'] }} onLayout={() => context?.onLayoutHomeView()}>
                <DraggableFlatList
                    style={[styles.scrollView]}
                    activationDistance={15}
                    contentContainerStyle={{ paddingBottom: 90 }}
                    data={
                        bookData
                            ? [
                                // First, keys in sortOrder that exist in bookData
                                ...sortOrder.filter((key) => bookData[key]),
                                // Then, any keys in bookData not in sortOrder
                                ...Object.keys(bookData).filter((key) => !sortOrder.includes(key))
                              ]
                            : []
                    }
                    keyExtractor={(bookKey) => bookKey}
                    onDragEnd={({ data }) => {
                        setSortOrder(data);
                        saveOrder(data);
                    }}
                    onDragBegin={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    }}
                    onPlaceholderIndexChange={(index => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    })}
                    renderItem={renderDraggableHymnalItem}
                    ListHeaderComponent={
                        <View style={styles.titleContainer}>
                            <Text style={styles.textStyle}>{i18n.t('home')}</Text>
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
                            <Text style={styles.fadedText}>{i18n.t('noHymnals')}</Text>
                            <View style={{ height: 5 }} />
                            <Text style={styles.descriptionText}>{i18n.t('addHymnal')}</Text>
                        </View>
                    }
                />
            </View>
        </>
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