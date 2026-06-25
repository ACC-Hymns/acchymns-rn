import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View, SectionList, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouterPushOnce } from '@/hooks/useRouterPushOnce';
import { useColorScheme } from '@/hooks/useColorScheme';
import StyledText from '@/components/StyledText';
import { useScripturePickerScrollHeader } from '@/components/scripturePicker/useScripturePickerScrollHeader';
import { makeScripturePickerStyles } from '@/components/scripturePicker/scripturePickerStyles';
import {
    chunkIntoRows,
    getBookColumns,
    getTileWidth,
    NEW_TESTAMENT_BOOKS,
    OLD_TESTAMENT_BOOKS,
} from '@/constants/scripturePickerLayout';
import { parsePickerIndex } from '@/constants/scripturePicker';

export default function ScripturePickerBooksScreen() {
    const theme = useColorScheme() ?? 'light';
    const styles = makeScripturePickerStyles(theme);
    const onScroll = useScripturePickerScrollHeader();
    const push = useRouterPushOnce();
    const params = useLocalSearchParams<{ index?: string }>();
    const pickerIndex = parsePickerIndex(params.index);
    const { width: screenWidth } = useWindowDimensions();
    const bookColumns = getBookColumns(screenWidth);
    const bookTileWidth = getTileWidth(screenWidth, bookColumns);
    const bookTileHeight = bookTileWidth / 2;
    const bookTileStyle = { width: bookTileWidth, height: bookTileHeight };

    const bookSections = useMemo(
        () => [
            { title: 'OLD TESTAMENT', data: chunkIntoRows(OLD_TESTAMENT_BOOKS, bookColumns) },
            { title: 'NEW TESTAMENT', data: chunkIntoRows(NEW_TESTAMENT_BOOKS, bookColumns) },
        ],
        [bookColumns],
    );

    return (
        <View style={styles.screen}>
            <SectionList
                key={`books-${bookColumns}`}
                style={{ flex: 1 }}
                contentInsetAdjustmentBehavior="automatic"
                onScroll={onScroll}
                scrollEventThrottle={16}
                sections={bookSections}
                contentContainerStyle={styles.listContent}
                stickySectionHeadersEnabled={false}
                keyExtractor={(row, index) => row.map((book) => book.name).join('-') || `row-${index}`}
                renderSectionHeader={({ section: { title } }) => (
                    <Text
                        style={[
                            styles.sectionHeader,
                            title === 'OLD TESTAMENT' && styles.sectionHeaderFirst,
                        ]}
                    >
                        {title}
                    </Text>
                )}
                renderItem={({ item: row }) => (
                    <View style={styles.bookRow}>
                        {row.map((book) => (
                            <TouchableOpacity
                                key={book.name}
                                style={[styles.bookTile, bookTileStyle]}
                                onPress={() => {
                                    push({
                                        pathname: '/(main)/(tabs)/(settings)/scripture_picker/[book]',
                                        params: {
                                            book: book.name,
                                            index: String(pickerIndex),
                                        },
                                    });
                                }}
                            >
                                <StyledText style={styles.tileBookText}>{book.name}</StyledText>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            />
        </View>
    );
}
