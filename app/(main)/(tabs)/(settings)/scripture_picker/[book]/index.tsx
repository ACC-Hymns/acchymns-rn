import React, { useLayoutEffect } from 'react';
import { FlatList, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import StyledText from '@/components/StyledText';
import { makeScripturePickerStyles } from '@/components/scripturePicker/scripturePickerStyles';
import {
    findBookByName,
    getChapterColumns,
    getTileWidth,
} from '@/constants/scripturePickerLayout';
import { parsePickerIndex } from '@/constants/scripturePicker';
import { useScripturePickerScrollHeader } from '@/components/scripturePicker/useScripturePickerScrollHeader';

export default function ScripturePickerChaptersScreen() {
    const theme = useColorScheme() ?? 'light';
    const styles = makeScripturePickerStyles(theme);
    const navigation = useNavigation();
    const onScroll = useScripturePickerScrollHeader();
    const params = useLocalSearchParams<{ book?: string; index?: string }>();
    const bookName = Array.isArray(params.book) ? params.book[0] : params.book;
    const pickerIndex = parsePickerIndex(params.index);
    const selectedBook = bookName ? findBookByName(bookName) : undefined;
    const { width: screenWidth } = useWindowDimensions();
    const chapterColumns = getChapterColumns(screenWidth);
    const chapterTileSize = getTileWidth(screenWidth, chapterColumns);
    const chapterTileStyle = { width: chapterTileSize, height: chapterTileSize };

    useLayoutEffect(() => {
        navigation.setOptions({
            title: selectedBook?.name ?? 'Select Chapter',
        });
    }, [navigation, selectedBook?.name]);

    if (!selectedBook) {
        return <View style={styles.screen} />;
    }

    return (
        <View style={styles.screen}>
            <FlatList
                key={`chapters-${chapterColumns}`}
                style={{ flex: 1 }}
                contentInsetAdjustmentBehavior="automatic"
                onScroll={onScroll}
                scrollEventThrottle={16}
                data={Array.from({ length: selectedBook.chapters }, (_, index) => index + 1)}
                numColumns={chapterColumns}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.gridRow}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item: chapter }) => (
                    <TouchableOpacity
                        style={[styles.tile, chapterTileStyle]}
                        onPress={() => {
                            router.push({
                                pathname: '/(main)/(tabs)/(settings)/scripture_picker/[book]/[chapter]',
                                params: {
                                    book: selectedBook.name,
                                    chapter: String(chapter),
                                    index: String(pickerIndex),
                                },
                            });
                        }}
                    >
                        <StyledText style={styles.tileText}>{chapter}</StyledText>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}
