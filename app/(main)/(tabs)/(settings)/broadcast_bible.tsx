import { Colors } from '@/constants/Colors';
import { StyleSheet, ScrollView, View } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { router, useNavigation } from 'expo-router';
import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { HymnalContext } from '@/constants/context';
import { useColorScheme } from '@/hooks/useColorScheme';
import ScripturePicker, { ScriptureSelection } from '@/components/ScripturePicker';
import { Reading } from '@/constants/bible';
import { request_client, set } from '@/scripts/broadcast';
import { isIOS26DesignDisabled } from '@/constants/iosDesign';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@react-native-vector-icons/ionicons';

const BIBLE_REFERENCES_KEY = 'broadcast_bible_references';
const PICKER_COUNT = 5;

function parseStoredReferences(raw: string | null): (ScriptureSelection | null)[] {
    const empty = Array.from({ length: PICKER_COUNT }, () => null);

    if (!raw) {
        return empty;
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return empty;
        }

        return Array.from({ length: PICKER_COUNT }, (_, index) => {
            const item = parsed[index];
            if (
                !item
                || typeof item !== 'object'
                || typeof item.bookName !== 'string'
                || typeof item.chapter !== 'number'
                || typeof item.rangeStart !== 'number'
                || (item.rangeEnd !== null && typeof item.rangeEnd !== 'number')
            ) {
                return null;
            }

            return {
                bookName: item.bookName,
                chapter: item.chapter,
                rangeStart: item.rangeStart,
                rangeEnd: item.rangeEnd,
            } satisfies ScriptureSelection;
        });
    } catch {
        return empty;
    }
}

export default function BroadcastBibleScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);
    const navigation = useNavigation();
    useLayoutEffect(() => {
        if (isIOS26DesignDisabled()) {

            navigation.setOptions({
                unstable_headerLeftItems: () => [
                    {
                        type: 'button',
                        label: 'Back',
                        icon: {
                            type: 'sfSymbol',
                            name: 'chevron.left'
                        },
                        tintColor: Colors[theme].icon,
                        onPress: () => {
                            router.back();
                        }
                    }
                ]
            });
        }
    }, []);
    const context = useContext(HymnalContext);

    const [references, setReferences] = useState<(ScriptureSelection | null)[]>(
        Array.from({ length: PICKER_COUNT }, () => null),
    );
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(BIBLE_REFERENCES_KEY)
            .then((stored) => setReferences(parseStoredReferences(stored)))
            .catch((error) => console.error('Error loading bible references:', error))
            .finally(() => setIsLoaded(true));
    }, []);

    useEffect(() => {
        if (!isLoaded) {
            return;
        }

        AsyncStorage.setItem(BIBLE_REFERENCES_KEY, JSON.stringify(references))
            .catch((error) => console.error('Error saving bible references:', error));
    }, [references, isLoaded]);

    async function handle_send(data: Reading) {
        if(!context)
            return;

        if(!context.broadcastingChurch)
            return;

        let top_text = data.book;
        let bottom_text = "";
        if (data.verse_start && data.verse_end) {
            bottom_text = `${data.chapter_start}:${data.verse_start}-${data.verse_end}`;
        } else {
            bottom_text = `${data.chapter_start}:${data.verse_start}`;
        }

        await set(request_client(), context?.broadcastingChurch, top_text, "BIBLE", [], bottom_text);
    }

    async function clearScreen() {
        if (!context?.broadcastingChurch) {
            return;
        }

        await set(request_client(), context.broadcastingChurch, "", "", [-1], "");
    }

    return (
        <>
            <View style={{ flex: 1, backgroundColor: Colors[theme]['background'] }}>
                <ScrollView style={styles.scrollView}>
                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                        {references.map((reference, index) => (
                            <ScripturePicker
                                key={index}
                                send={handle_send}
                                value={reference}
                                onValueChange={(value) => {
                                    setReferences((current) => {
                                        const next = [...current];
                                        next[index] = value;
                                        return next;
                                    });
                                }}
                            />
                        ))}

                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={clearScreen}
                        >
                            <Ionicons
                                name='trash-outline'
                                size={18}
                                color='white'
                            />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        clearButton: {
            backgroundColor: Colors[theme].destructive,
            padding: 15,
            marginTop: 20,
            borderRadius: 15,
            justifyContent: 'center',
            alignItems: 'center',
            width: '25%',
        },
        destructiveSettingsText: {
            fontSize: 18,
            fontWeight: '400',
            color: Colors[theme].destructive,
            fontFamily: 'Lato',
        },
        settingsLabel: {
            fontSize: 14,
            fontWeight: '400',
            color: Colors[theme]['fadedText'],
            fontFamily: 'Lato',
            marginLeft: '5%',
            marginVertical: 8,
        },
        settingsContainer: {
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 12,
            overflow: 'hidden',
        },
        settingsItem: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: '5%',
            paddingVertical: 14,
            
        },
        settingsText: {
            fontSize: 18,
            fontWeight: '400',
            color: Colors[theme]['text'],
            fontFamily: 'Lato',
        },

        scrollView: {
            flex: 1,
            width: '100%',
            paddingTop: 125,
            paddingBottom: 15,
            paddingRight: 20,
            paddingLeft: 20
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
            fontWeight: '700',
            fontFamily: 'Lato',
            textAlign: 'center'
        },
        screenContainer: {
            flex: 1,
            backgroundColor: Colors[theme]['background']
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
            color: Colors[theme]['text'],
            fontFamily: 'Lato'
        },
    });

};
