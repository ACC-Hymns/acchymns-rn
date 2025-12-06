import { Colors } from '@/constants/Colors';
import { Text, StyleSheet, SafeAreaView, ScrollView, View, useColorScheme, TouchableHighlight } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Divider } from 'react-native-elements';
import Constants from 'expo-constants';
import { HymnalContext } from '@/constants/context';
import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import { translations } from '@/constants/localization';
import StyledText from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import ScripturePicker from '@/components/ScripturePicker';
import { Reading } from '@/constants/bible';
import { request_client, set } from '@/scripts/broadcast';

export default function BroadcastBibleScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const router = useRouter();
    const context = useContext(HymnalContext);

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

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

    return (
        <>
            <View style={{ flex: 1, backgroundColor: Colors[theme]['background'] }}>
                <ScrollView style={styles.scrollView}>
                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                        <ScripturePicker send={handle_send} />
                        <ScripturePicker send={handle_send} />
                        <ScripturePicker send={handle_send} />
                        <ScripturePicker send={handle_send} />
                        <ScripturePicker send={handle_send} />
                    </View>
                </ScrollView>
            </View>
        </>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
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
            fontWeight: 'bold',
            fontFamily: 'Lato',
            textAlign: 'center'
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
    });

};