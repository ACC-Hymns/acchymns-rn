import React, { useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, useColorScheme, Pressable, View, TouchableHighlight } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Checkbox } from '@futurejj/react-native-checkbox';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { useI18n } from '@/hooks/useI18n';
import StyledText from '@/components/StyledText';
import { FlatList } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DiscoverFiltersBottomSheetProps {
    bottomSheetModalRef: React.RefObject<BottomSheetModal | null>;
    hymnalsAvailable: string[];
    selectedHymnals: string[];
    setSelectedHymnals: (hymnals: string[]) => void;
    onSheetChanges?: (index: number) => void;
}

export function DiscoverFiltersBottomSheet({
    bottomSheetModalRef,
    hymnalsAvailable,
    selectedHymnals,
    setSelectedHymnals,
    onSheetChanges,
}: DiscoverFiltersBottomSheetProps) {
    const theme = useColorScheme() ?? 'light';
    const context = useContext(HymnalContext);
    const i18n = useI18n();
    const styles = makeStyles(theme as any);

    /*
    if (selectedHymnals.includes(item)) {
        setSelectedHymnals(selectedHymnals.filter((h) => h !== item));
    } else {
        setSelectedHymnals([...selectedHymnals, item]);
    }
    */

    const [availableHymnalsSorted, setAvailableHymnalsSorted] = useState<string[]>(hymnalsAvailable);


    const [queuedChanges, setQueuedChanges] = useState<string[]>(selectedHymnals);

    // check if the queued changes are different from the selected hymnals
    const hasChanges = useMemo(() => {
        return queuedChanges.length !== selectedHymnals.length || queuedChanges.some((h) => !selectedHymnals.includes(h));
    }, [queuedChanges, selectedHymnals]);

    const handleApplyChanges = () => {
        setSelectedHymnals(queuedChanges);
        bottomSheetModalRef.current?.dismiss();
    }

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            onAnimate={async () => {
                const order = await AsyncStorage.getItem("hymnal_sort_order");
                if (order) {
                    const sortedHymnalsData = JSON.parse(order);
                    const sortedHymnals = sortedHymnalsData.filter((hymnal: string) => hymnalsAvailable.includes(hymnal));
                    setAvailableHymnalsSorted(sortedHymnals);
                } else {
                    setAvailableHymnalsSorted(hymnalsAvailable);
                }
                setQueuedChanges(selectedHymnals);
            }}
            onChange={(index) => {
                onSheetChanges?.(index);
            }}
            style={styles.bottomSheet}
            backgroundStyle={styles.bottomSheet}
            handleIndicatorStyle={styles.handleIndicator}
        >
            <BottomSheetView style={styles.contentContainer}>
                <View style={{ width: '100%' }}>
                    <View>
                        <StyledText style={styles.bottomSheetHeaderText}>
                            {i18n.t('filters')}
                        </StyledText>
                    </View>
                    <View style={styles.hymnalListContainer}>
                        <View style={styles.flatListWrapper}>
                            <FlatList
                                data={availableHymnalsSorted}
                                showsVerticalScrollIndicator={false}
                                // Add an empty View with a specific width for the header (first item margin)
                                ListHeaderComponent={<View style={{ height: 16 }} />}
                                // Add an empty View with a specific width for the footer (last item margin)
                                ListFooterComponent={<View style={{ height: 16 }} />}
                                renderItem={({ item }) => (
                                    <TouchableHighlight
                                        underlayColor={Colors[theme].divider}
                                        onPress={() => {
                                            if (queuedChanges.includes(item)) {
                                                setQueuedChanges(queuedChanges.filter((h) => h !== item));
                                            } else {
                                                setQueuedChanges([...queuedChanges, item]);
                                            }
                                        }}
                                        style={[
                                            styles.hymnalItem,
                                            { backgroundColor: queuedChanges.includes(item) ? Colors[theme].divider : Colors[theme].settingsButton }
                                        ]}>
                                        <View style={styles.hymnalItemContent}>
                                            <View style={styles.hymnalItemIconContainer}>
                                                <Ionicons name={queuedChanges.includes(item) ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={queuedChanges.includes(item) ? Colors[theme].text : Colors[theme].fadedIcon} />
                                            </View>
                                            <StyledText style={[styles.filterText, styles.hymnalItemText, { opacity: queuedChanges.includes(item) ? 1 : 0.75 }]}>{context?.BOOK_DATA[item]?.name.medium || item}</StyledText>

                                        </View>
                                    </TouchableHighlight>
                                )}
                                keyExtractor={(item) => item}
                            />
                            <LinearGradient
                                colors={[Colors[theme].settingsButton, Colors[theme].settingsButtonTransparent]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.topFade}
                                pointerEvents="none"
                            />
                            <LinearGradient
                                colors={[Colors[theme].settingsButtonTransparent, Colors[theme].settingsButton]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.bottomFade}
                                pointerEvents="none"
                            />
                        </View>
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                gap: 20,
                                marginVertical: 20,
                            }}
                        >
                            <TouchableOpacity onPress={() => {
                                if (queuedChanges.length > 0) {
                                    setQueuedChanges([]);
                                } else {
                                    bottomSheetModalRef.current?.dismiss();
                                }
                            }} style={styles.resetButton}>
                                <StyledText style={styles.resetButtonText}>{queuedChanges.length > 0 ? i18n.t('clear') : i18n.t('cancel')}</StyledText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleApplyChanges}
                                style={[styles.applyButton]}
                            >
                                <StyledText style={styles.applyButtonText}>{i18n.t('confirm')}</StyledText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </BottomSheetView>
        </BottomSheetModal>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        handleIndicator: {
            backgroundColor: Colors[theme]['divider'],
            height: 4,
            width: 48,
        },
        contentContainer: {
            flex: 1,
            padding: 8,
            paddingBottom: 20,
            alignItems: 'center',
        },
        bottomSheet: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 7 },
            shadowOpacity: 0.43,
            shadowRadius: 9.51,
            elevation: 15,
            backgroundColor: Colors[theme]['settingsButton'],
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
        },
        closeButton: {
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 32,
            padding: 8,
        },
        bottomSheetHeaderText: {
            color: Colors[theme]['text'],
            fontSize: 18,
            fontFamily: 'Lato',
            fontWeight: '500',
            textAlign: 'center',
            marginVertical: 8
        },
        filterText: {
            color: Colors[theme]['text'],
            fontSize: 18,
            marginLeft: 10,
        },
        resetButtonText: {
            color: Colors[theme]['text'],
            fontSize: 18,
            textAlign: 'center',
            fontFamily: 'Lato',
            fontWeight: '400',
        },
        applyButtonText: {
            color: Colors[theme].songBackground,
            fontSize: 18,
            textAlign: 'center',
            fontFamily: 'Lato',
        },
        resetButton: {
            padding: 16,
            minWidth: 100,
        },
        applyButton: {
            backgroundColor: Colors[theme].text,
            borderRadius: 16,
            padding: 16,
            minWidth: 100,
        },
        hymnalListContainer: {
            marginHorizontal: 10,
            marginTop: 10,
        },
        flatListWrapper: {
            position: 'relative',
            maxHeight: 250,
        },
        topFade: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 20,
            zIndex: 1,
        },
        bottomFade: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 20,
            zIndex: 1,
        },
        hymnalItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 12,
            paddingVertical: 16,
            marginVertical: 4,
            borderRadius: 16,
            borderWidth: 0.5,
            borderColor: Colors[theme]['divider'],
        },
        hymnalItemContent: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        hymnalItemText: {
            flex: 1,
            color: Colors[theme].text,
        },
        hymnalItemIconContainer: {
            marginHorizontal: 8,
        },
    });
}
