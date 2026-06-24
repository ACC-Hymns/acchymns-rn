import React, { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Platform, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useI18n } from '@/hooks/useI18n';
import StyledText from '@/components/StyledText';
import { useScripturePickerScrollHeader } from '@/components/scripturePicker/useScripturePickerScrollHeader';
import { makeScripturePickerStyles } from '@/components/scripturePicker/scripturePickerStyles';
import {
    findBookByName,
    getChapterColumns,
    getTileWidth,
} from '@/constants/scripturePickerLayout';
import {
    getScriptureReference,
    parsePickerIndex,
    ScriptureSelection,
    setScriptureReference,
} from '@/constants/scripturePicker';
import { Colors } from '@/constants/Colors';
import { isIOS26DesignDisabled, isIOS26DesignEnabled } from '@/constants/iosDesign';

export default function ScripturePickerVersesScreen() {
    const theme = useColorScheme() ?? 'light';
    const styles = makeScripturePickerStyles(theme);
    const navigation = useNavigation();
    const onScroll = useScripturePickerScrollHeader();
    const i18n = useI18n();
    const params = useLocalSearchParams<{ book?: string; chapter?: string; index?: string }>();
    const bookName = Array.isArray(params.book) ? params.book[0] : params.book;
    const chapterValue = Array.isArray(params.chapter) ? params.chapter[0] : params.chapter;
    const pickerIndex = parsePickerIndex(params.index);
    const selectedBook = bookName ? findBookByName(bookName) : undefined;
    const selectedChapter = chapterValue ? Number(chapterValue) : null;
    const existingReference = getScriptureReference(pickerIndex);
    const { width: screenWidth } = useWindowDimensions();
    const chapterColumns = getChapterColumns(screenWidth);
    const chapterTileSize = getTileWidth(screenWidth, chapterColumns);
    const chapterTileStyle = { width: chapterTileSize, height: chapterTileSize };
    const useNativeToolbar = Platform.OS === 'ios' && isIOS26DesignEnabled();

    const [rangeStart, setRangeStart] = useState<number | null>(() => {
        if (
            existingReference
            && existingReference.bookName === bookName
            && existingReference.chapter === selectedChapter
        ) {
            return existingReference.rangeStart;
        }
        return null;
    });
    const [rangeEnd, setRangeEnd] = useState<number | null>(() => {
        if (
            existingReference
            && existingReference.bookName === bookName
            && existingReference.chapter === selectedChapter
        ) {
            return existingReference.rangeEnd;
        }
        return null;
    });

    const canConfirm = rangeStart != null;
    const confirmLabel = i18n.t('confirm');

    const handleConfirm = useCallback(() => {
        if (!selectedBook || selectedChapter == null || rangeStart == null) {
            return;
        }

        const selection: ScriptureSelection = {
            bookName: selectedBook.name,
            chapter: selectedChapter,
            rangeStart,
            rangeEnd,
        };

        setScriptureReference(pickerIndex, selection);
        router.dismissTo('/(main)/(tabs)/(settings)/broadcast_bible');
    }, [pickerIndex, rangeEnd, rangeStart, selectedBook, selectedChapter]);

    useLayoutEffect(() => {
        const title = selectedBook && selectedChapter
            ? `${selectedBook.name} ${selectedChapter}`
            : 'Select Verses';

        if (useNativeToolbar) {
            navigation.setOptions({
                title,
                headerLeft: () => null,
                headerShadowVisible: false,
            });
            return;
        }

        if (isIOS26DesignDisabled()) {
            navigation.setOptions({
                title,
                headerLeft: undefined,
                headerShadowVisible: false,
                unstable_headerLeftItems: () => [
                    {
                        type: 'button',
                        label: 'Back',
                        icon: {
                            type: 'sfSymbol',
                            name: 'chevron.left',
                        },
                        tintColor: Colors[theme].icon,
                        onPress: () => router.back(),
                    },
                ],
                unstable_headerRightItems: canConfirm
                    ? () => [
                        {
                            type: 'button',
                            label: confirmLabel,
                            tintColor: Colors[theme].primary,
                            onPress: handleConfirm,
                        },
                    ]
                    : () => [],
            });
            return;
        }

        navigation.setOptions({
            title,
            headerShadowVisible: false,
            headerRight: canConfirm
                ? () => (
                    <TouchableOpacity onPress={handleConfirm} hitSlop={10} style={{ paddingHorizontal: 8 }}>
                        <Text style={{ color: Colors[theme].primary, fontSize: 17, fontWeight: '600' }}>
                            {confirmLabel}
                        </Text>
                    </TouchableOpacity>
                )
                : undefined,
        });
    }, [
        canConfirm,
        confirmLabel,
        handleConfirm,
        navigation,
        selectedBook,
        selectedChapter,
        theme,
        useNativeToolbar,
    ]);

    const inRange = (verse: number) => {
        if (rangeStart === null) {
            return false;
        }
        if (rangeEnd === null) {
            return verse === rangeStart;
        }
        return verse >= rangeStart && verse <= rangeEnd;
    };

    const handleVersePress = (verse: number) => {
        if (rangeStart === null || (rangeStart !== null && rangeEnd !== null)) {
            setRangeStart(verse);
            setRangeEnd(null);
            return;
        }

        if (verse < rangeStart) {
            setRangeEnd(rangeStart);
            setRangeStart(verse);
            return;
        }

        setRangeEnd(verse);
    };

    if (!selectedBook || selectedChapter == null) {
        return null;
    }

    return (
        <>
            <FlatList
                key={`verses-${chapterColumns}`}
                style={{ flex: 1, backgroundColor: Colors[theme].background }}
                contentInsetAdjustmentBehavior="automatic"
                onScroll={onScroll}
                scrollEventThrottle={16}
                data={Array.from(
                    { length: selectedBook.verses[selectedChapter - 1] },
                    (_, index) => index + 1,
                )}
                numColumns={chapterColumns}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.gridRow}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item: verse }) => (
                    <TouchableOpacity
                        style={[
                            styles.tile,
                            chapterTileStyle,
                            inRange(verse) && styles.tileSelected,
                        ]}
                        onPress={() => handleVersePress(verse)}
                    >
                        <StyledText
                            style={[
                                styles.tileText,
                                inRange(verse) && styles.tileTextSelected,
                            ]}
                        >
                            {verse}
                        </StyledText>
                    </TouchableOpacity>
                )}
            />
            {useNativeToolbar && (
                <>
                    <Stack.Toolbar placement="left">
                        <Stack.Toolbar.Button
                            icon="chevron.left"
                            onPress={() => router.back()}
                            tintColor={Colors[theme].icon}
                        />
                    </Stack.Toolbar>
                    <Stack.Toolbar placement="right">
                        <Stack.Toolbar.Button
                            variant="done"
                            onPress={handleConfirm}
                            hidden={!canConfirm}
                            disabled={!canConfirm}
                        >
                            {confirmLabel}
                        </Stack.Toolbar.Button>
                    </Stack.Toolbar>
                </>
            )}
        </>
    );
}
