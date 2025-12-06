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
import { request_client, set } from '@/scripts/broadcast';

export default function BroadcastOptionsScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const router = useRouter();
    const context = useContext(HymnalContext);

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    function signout() {
        context?.setBroadcastingToken(null);
        context?.setBroadcastingChurch(null);
        router.replace('/(tabs)/(settings)/broadcast');
    }

    async function clear() {
        if(!context?.broadcastingChurch)
            return;
        await set(request_client(), context?.broadcastingChurch, "", "", [-1], "");
    }

    return (
        <>
            <View style={{ flex: 1, backgroundColor: Colors[theme]['background'] }}>
                <ScrollView style={styles.scrollView}>
                    <View style={{}}>
                        <StyledText style={styles.settingsLabel}>{i18n.t('info')}</StyledText>
                    </View>
                    <View style={[styles.settingsContainer]}>
                        <TouchableHighlight
                            underlayColor={Colors[theme].divider}
                        >
                            <View style={styles.settingsItem}>
                                <StyledText style={styles.settingsText}>{i18n.t('selectedChurch')}</StyledText>
                                <StyledText style={[styles.settingsText, { color: Colors[theme].fadedText }]}>{context?.broadcastingChurch}</StyledText>
                            </View>
                        </TouchableHighlight>
                    </View>
                    <View style={{ marginTop: 24 }}>
                        <StyledText style={styles.settingsLabel}>{i18n.t('actions')}</StyledText>
                    </View>
                    <View style={[styles.settingsContainer]}>
                        <TouchableHighlight
                            onPress={() => router.push('/(tabs)/(settings)/broadcast_song')}
                            underlayColor={Colors[theme].divider}
                        >
                            <View style={styles.settingsItem}>
                                <StyledText style={styles.settingsText}>{i18n.t('setSongNumber')}</StyledText>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <IconSymbol name="chevron.right" size={14} weight='bold' color={Colors[theme].fadedIcon} />
                                </View>
                            </View>
                        </TouchableHighlight>
                        <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                        <TouchableHighlight
                            onPress={() => router.push('/(tabs)/(settings)/broadcast_bible')}
                            underlayColor={Colors[theme].divider}
                        >
                            <View style={styles.settingsItem}>
                                <StyledText style={styles.settingsText}>{i18n.t('setBibleReading')}</StyledText>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <IconSymbol name="chevron.right" size={14} weight='bold' color={Colors[theme].fadedIcon} />
                                </View>
                            </View>
                        </TouchableHighlight>
                        <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                        <TouchableHighlight
                            onPress={clear}
                            underlayColor={Colors[theme].divider}
                        >
                            <View style={styles.settingsItem}>
                                <StyledText style={styles.settingsText}>{i18n.t('clearScreen')}</StyledText>
                            </View>
                        </TouchableHighlight>
                    </View>
                    <View style={{ marginTop: 24 }} />
                    <View style={[styles.settingsContainer]}>
                        <TouchableHighlight
                            onPress={() => signout()}
                            underlayColor={Colors[theme].divider}
                        >
                            <View style={styles.settingsItem}>
                                <StyledText style={styles.destructiveSettingsText}>{i18n.t('logOut')}</StyledText>
                            </View>
                        </TouchableHighlight>
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