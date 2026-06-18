import { BIBLE_BOOKS, BibleBook, Reading } from '@/constants/bible';
import React, { useContext, useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    FlatList,
    StyleSheet,
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import StyledText from './StyledText';
import { HymnalContext } from '@/constants/context';
import { useI18n } from '@/hooks/useI18n';
import { Colors } from '@/constants/Colors';
import Ionicons from '@react-native-vector-icons/ionicons'

export type ScriptureSelection = {
    bookName: string;
    chapter: number;
    rangeStart: number;
    rangeEnd: number | null;
};

interface ScripturePickerProps {
    send: (input: Reading) => void;
    value?: ScriptureSelection | null;
    onValueChange?: (value: ScriptureSelection | null) => void;
}

function findBookByName(name: string): BibleBook | undefined {
    return BIBLE_BOOKS.find((book) => book.name === name);
}

function selectionToReading(selection: ScriptureSelection): Reading {
    return {
        book: selection.bookName,
        chapter_start: String(selection.chapter),
        chapter_end: String(selection.chapter),
        verse_start: String(selection.rangeStart),
        verse_end: selection.rangeEnd != null ? String(selection.rangeEnd) : undefined,
    };
}

export default function ScripturePicker({ send, value, onValueChange }: ScripturePickerProps) {

    const context = useContext(HymnalContext);

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);
    const i18n = useI18n();

    const isControlled = onValueChange !== undefined;

    useEffect(() => {
        if (!isControlled) {
            return;
        }

        if (!value) {
            setSelectedBook(null);
            setSelectedChapter(null);
            setRangeStart(null);
            setRangeEnd(null);
            return;
        }

        setSelectedBook(findBookByName(value.bookName) ?? null);
        setSelectedChapter(value.chapter);
        setRangeStart(value.rangeStart);
        setRangeEnd(value.rangeEnd);
    }, [isControlled, value]);

    const [modalVisible, setModalVisible] = useState(false);

    const [step, setStep] = useState<'books' | 'chapters' | 'verses'>('books');
    const [selectedBook, setSelectedBook] = useState<BibleBook | null>(
        value ? findBookByName(value.bookName) ?? null : null,
    );
    const [selectedChapter, setSelectedChapter] = useState<number | null>(value?.chapter ?? null);

    const [rangeStart, setRangeStart] = useState<number | null>(value?.rangeStart ?? null);
    const [rangeEnd, setRangeEnd] = useState<number | null>(value?.rangeEnd ?? null);

    const updateSelection = (
        book: BibleBook | null,
        chapter: number | null,
        start: number | null,
        end: number | null,
    ) => {
        setSelectedBook(book);
        setSelectedChapter(chapter);
        setRangeStart(start);
        setRangeEnd(end);

        if (!onValueChange) {
            return;
        }

        if (book && chapter != null && start != null) {
            onValueChange({
                bookName: book.name,
                chapter,
                rangeStart: start,
                rangeEnd: end,
            });
        } else if (!book && chapter == null && start == null && end == null) {
            onValueChange(null);
        }
    };

    const handleVersePress = (verse: number) => {
        if (rangeStart === null || (rangeStart !== null && rangeEnd !== null)) {
            updateSelection(selectedBook, selectedChapter, verse, null);
        } else if (verse < rangeStart) {
            updateSelection(selectedBook, selectedChapter, verse, rangeStart);
        } else {
            updateSelection(selectedBook, selectedChapter, rangeStart, verse);
        }
    };

    const inRange = (verse: number) => {
        if (rangeStart === null) return false;
        if (rangeEnd === null) return verse === rangeStart;
        return verse >= rangeStart && verse <= rangeEnd;
    };

    const getSelectionString = () => {
        if (!selectedBook || !selectedChapter) return 'Select Passage';
        if (rangeStart && rangeEnd) {
            return `${selectedBook.name} ${selectedChapter}:${rangeStart}-${rangeEnd}`;
        }
        if (rangeStart) {
            return `${selectedBook.name} ${selectedChapter}:${rangeStart}`;
        }
        return `${selectedBook.name} ${selectedChapter}`;
    };

    function padToFullRows<T>(data: T[], numColumns: number): (T | null)[] {
        const remainder = data.length % numColumns;
        if (remainder === 0) return data;
        const padding = Array(numColumns - remainder).fill(null);
        return [...data, ...padding];
    }

    return (
        <View style={styles.container}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                    style={styles.input}
                    onPress={() => {
                        if (isControlled) {
                            if (value) {
                                setSelectedBook(findBookByName(value.bookName) ?? null);
                                setSelectedChapter(value.chapter);
                                setRangeStart(value.rangeStart);
                                setRangeEnd(value.rangeEnd);
                            } else {
                                setSelectedBook(null);
                                setSelectedChapter(null);
                                setRangeStart(null);
                                setRangeEnd(null);
                            }
                        }

                        setModalVisible(true);

                        if (value?.rangeStart ?? rangeStart) {
                            setStep('verses')
                        } else if (value?.chapter ?? selectedChapter) {
                            setStep('chapters')
                        } else {
                            setStep('books')
                        }
                    }}
                >
                    <StyledText style={styles.inputText}>{getSelectionString()}</StyledText>
                </TouchableOpacity>
                {rangeStart && (
                    <TouchableOpacity
                        style={styles.sendButton}
                        onPress={() => {
                            if (!selectedBook || selectedChapter == null || rangeStart == null) {
                                return;
                            }

                            send(selectionToReading({
                                bookName: selectedBook.name,
                                chapter: selectedChapter,
                                rangeStart,
                                rangeEnd,
                            }));
                        }}
                    >
                        <Ionicons
                            name='send'
                            size={18}
                            color='white'
                        />
                    </TouchableOpacity>
                )}
            </View>

            <Modal visible={modalVisible} animationType="slide" backdropColor={Colors[theme]['background']}>
                <View style={styles.modal}>

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => {
                                if (step === 'chapters') setStep('books');
                                else if (step === 'verses') setStep('chapters');
                                else if (step === 'books') setModalVisible(false);
                                if (step === 'verses') {
                                    updateSelection(selectedBook, selectedChapter, null, null);
                                }
                            }}
                            hitSlop={10}>
                            <Ionicons
                                name="chevron-back"
                                size={24}
                                color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                            />
                        </TouchableOpacity>
                        {step === 'books' && (
                            <Text style={styles.headerTitle}>Select Book</Text>
                        )}
                        {step === 'chapters' && (
                            <Text style={styles.headerTitle}>{selectedBook?.name}</Text>
                        )}
                        {step === 'verses' && (
                            <Text style={styles.headerTitle}>
                                {selectedBook?.name} {selectedChapter}
                            </Text>
                        )}
                        <TouchableOpacity
                            onPress={() => { }}
                            style={{ opacity: 0 }}
                            hitSlop={10}>
                            <Ionicons
                                name="chevron-back"
                                size={24}
                                color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    {step === 'books' && (
                        <FlatList
                            data={BIBLE_BOOKS}
                            numColumns={3}
                            keyExtractor={(item) => item.name}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.bookTile}
                                    onPress={() => {
                                        updateSelection(item, null, null, null);
                                        setStep('chapters');
                                    }}
                                >
                                    <StyledText style={styles.tileBookText}>{item.name}</StyledText>
                                </TouchableOpacity>
                            )}
                        />
                    )}

                    {step === 'chapters' && selectedBook && (
                        <FlatList
                            data={padToFullRows(
                                Array.from({ length: selectedBook.chapters }, (_, i) => i + 1),
                                5 // your numColumns for chapters
                            )}
                            numColumns={5}
                            columnWrapperStyle={{ justifyContent: 'space-between' }}
                            keyExtractor={(item, index) => (item === null ? `empty-${index}` : item.toString())}
                            renderItem={({ item: chapter }) => {
                                if (chapter === null) {
                                    return <View style={[styles.tile, { opacity: 0 }]} />;
                                }
                                return (
                                    <TouchableOpacity
                                        style={styles.tile}
                                        onPress={() => {
                                            updateSelection(selectedBook, chapter, null, null);
                                            setStep('verses');
                                        }}
                                    >
                                        <StyledText
                                            style={[
                                                styles.tileText
                                            ]}
                                        >{chapter}</StyledText>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    )}

                    {step === 'verses' && selectedBook && selectedChapter && (
                        <>
                            <FlatList
                                data={padToFullRows(
                                    Array.from({ length: selectedBook.verses[selectedChapter - 1] }, (_, i) => i + 1),
                                    5 // your numColumns
                                )}
                                numColumns={5}
                                columnWrapperStyle={{ justifyContent: 'flex-start' }}
                                contentContainerStyle={{ justifyContent: 'center' }}
                                keyExtractor={(item, index) => (item === null ? `empty-${index}` : item.toString())}
                                renderItem={({ item: verse }) => {
                                    if (verse === null) {
                                        return <View style={[styles.tile, { opacity: 0 }]} />;
                                    }
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.tile,
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
                                    );
                                }}
                            />
                            {rangeStart && (
                                <TouchableOpacity
                                    style={styles.confirmButton}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <StyledText style={styles.confirmButtonText}>Confirm</StyledText>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>
            </Modal>
        </View>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        container: {
            paddingVertical: 20,
        },
        inputText: {
            color: Colors[theme]['text'],
            textAlign: 'center'
        },
        sendButton: {
            backgroundColor: Colors[theme]['primary'],
            padding: 5,
            paddingHorizontal: 15,
            borderRadius: 15,
            justifyContent: 'center',
            alignItems: 'center'
        },
        input: {
            backgroundColor: Colors[theme]['settingsButton'],
            padding: 15,
            borderRadius: 15,
        },
        modal: {
            flex: 1,
            padding: 20,
            marginTop: 50,
            justifyContent: 'center',
            backgroundColor: Colors[theme]['background']
        },
        header: {
            justifyContent: 'space-between',
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20,
        },
        backButton: {
            fontSize: 16,
            color: '#4CAF50',
        },
        headerTitle: {
            fontSize: 18,
            color: Colors[theme]['text']
        },
        bookTile: {
            flex: 1,
            margin: 5,
            aspectRatio: 2,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 15,
        },
        tile: {
            flex: 1,
            margin: 5,
            aspectRatio: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 15
        },
        tileSelected: {
            backgroundColor: Colors[theme]['primary'],
        },
        tileText: {
            fontSize: 16,
            color: Colors[theme]['text'],
            textAlign: 'center'
        },
        tileBookText: {
            fontSize: 14,
            color: Colors[theme]['text'],
            textAlign: 'center'
        },
        tileTextSelected: {
            color: '#fff',
            fontWeight: '700',
        },
        confirmButton: {
            marginVertical: 40,
            backgroundColor: Colors[theme]['primary'],
            padding: 15,
            borderRadius: 15,
            alignItems: 'center',
        },
        confirmButtonText: {
            color: '#fff',
            fontSize: 18
        },
    });
}
