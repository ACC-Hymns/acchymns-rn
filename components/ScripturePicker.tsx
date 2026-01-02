import { BIBLE_BOOKS, BibleBook, Reading } from '@/constants/bible';
import React, { useContext, useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    useColorScheme,
} from 'react-native';
import StyledText from './StyledText';
import { IconSymbol } from './ui/IconSymbol';
import { I18n } from 'i18n-js';
import { translations } from '@/constants/localization';
import { HymnalContext } from '@/constants/context';
import { getLocales } from 'expo-localization';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface ScripturePickerProps {
    send: (input: Reading) => void;
}
export default function ScripturePicker({send}: ScripturePickerProps) {

    const context = useContext(HymnalContext);

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);
    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    const [modalVisible, setModalVisible] = useState(false);

    const [step, setStep] = useState<'books' | 'chapters' | 'verses'>('books');
    const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
    const [selectedChapter, setSelectedChapter] = useState<number | null>(null);

    const [rangeStart, setRangeStart] = useState<number | null>(null);
    const [rangeEnd, setRangeEnd] = useState<number | null>(null);

    const handleVersePress = (verse: number) => {
        if (rangeStart === null || (rangeStart !== null && rangeEnd !== null)) {
            setRangeStart(verse);
            setRangeEnd(null);
        } else {
            if (verse < rangeStart) {
                setRangeStart(verse);
                setRangeEnd(rangeStart);
            } else {
                setRangeEnd(verse);
            }
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
                        setModalVisible(true);
                        
                        if(rangeStart) {
                            setStep('verses')
                        } else if (selectedChapter) {
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
                            send({
                                book: selectedBook?.name,
                                chapter_start: selectedChapter || "",
                                chapter_end: selectedChapter || "",
                                verse_start: rangeStart || "",
                                verse_end: rangeEnd || undefined
                            } as Reading);
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
                                setRangeStart(null);
                                setRangeEnd(null);
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center' }} hitSlop={5}>
                            <IconSymbol name="chevron.left" size={18} color="#007AFF" />
                            <StyledText style={{ color: '#007AFF', fontSize: 18, marginLeft: 5 }}>{i18n.t('back')}</StyledText>
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
                            style={{ flexDirection: 'row', alignItems: 'center', opacity: 0 }} hitSlop={5}>
                            <IconSymbol name="chevron.left" size={18} color="#007AFF" />
                            <StyledText style={{ color: '#007AFF', fontSize: 18, marginLeft: 5 }}>{i18n.t('back')}</StyledText>
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
                                        setSelectedBook(item);
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
                                            setSelectedChapter(chapter);
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
            fontWeight: 'bold',
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
