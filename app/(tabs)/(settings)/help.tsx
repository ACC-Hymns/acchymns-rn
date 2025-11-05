import { Colors } from '@/constants/Colors';
import { Text, StyleSheet, SafeAreaView, ScrollView, View, useColorScheme, TouchableHighlight, Linking, Alert } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import React, { useContext, useLayoutEffect } from 'react';
import { Divider } from 'react-native-elements';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { HymnalContext } from '@/constants/context';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { clearCache, deleteAllHymnals, loadHymnals } from '@/scripts/hymnals';
import PostHog, { usePostHog } from 'posthog-react-native';
import { translations } from '@/constants/localization';
import StyledText from '@/components/StyledText';

export default function HelpScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const router = useRouter();
    const context = useContext(HymnalContext);
    const navigation = useNavigation();

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';
    useLayoutEffect(() => {
        navigation.setOptions({
            title: i18n.t('help'),
        });
    }, [navigation]);

    const posthog = usePostHog()
    return (
        <>
            <View style={{ flex: 1, backgroundColor: Colors[theme]['background'] }}>
            <ScrollView style={styles.scrollView}>
                <View style={{}}>
                    <StyledText style={styles.settingsLabel}>{i18n.t('general')}</StyledText>
                </View>
                <View style={[styles.settingsContainer]}>
                    <TouchableHighlight
                        onPress={() => { 
                            Linking.openURL('https://forms.gle/Ezh7d8LFsN5eKdo87');
                        }}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <StyledText style={styles.settingsText}>{i18n.t('reportBug')}</StyledText>
                            <IconSymbol name="link" size={14} weight='bold' color={Colors[theme].fadedIcon} />
                        </View>
                    </TouchableHighlight>
                    <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                    <TouchableHighlight
                        onPress={() => { 
                            Linking.openURL('https://forms.gle/1t7rtUkNaksEUtPEA');
                        }}
                            underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <StyledText style={styles.settingsText}>{i18n.t('requestBook')}</StyledText>
                            <IconSymbol name="link" size={14} weight='bold' color={Colors[theme].fadedIcon} />
                        </View>
                    </TouchableHighlight>
                    <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                    <TouchableHighlight
                        onPress={() => { 
                            Linking.openURL('https://docs.google.com/document/d/1zWztUrFOr_6ksqDDm4EbQ0jk7trwofaVeeSybcD5PcA');
                        }}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <StyledText style={styles.settingsText}>{i18n.t('privacyPolicy')}</StyledText>
                            <IconSymbol name="link" size={14} weight='bold' color={Colors[theme].fadedIcon} />
                        </View>
                    </TouchableHighlight>
                    <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                    <TouchableHighlight
                        onPress={async () => {
                            if(context?.postHogOptedIn) {
                                context?.setPostHogOptedIn(false);
                                await posthog.optIn();
                            } else {
                                Alert.alert(i18n.t('posthogOptOutConfirmation'), i18n.t('posthogOptOutConfirmationMessage'), [
                                    {
                                        text: i18n.t('cancel'),
                                        onPress: () => {
                                            context?.setPostHogOptedIn(false);
                                        },
                                        style: 'cancel',
                                        isPreferred: true
                                    },
                                    {
                                        text: i18n.t('confirm'),
                                        onPress: async () => {
                                            // opt out of posthog
                                            context?.setPostHogOptedIn(true);
                                            await posthog.optOut();
                                        },
                                        style: 'default'
                                    },
                                ]);
                            }
                        }}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <StyledText style={styles.settingsText}>{context?.postHogOptedIn ? i18n.t('posthogOptIn') : i18n.t('posthogOptOut')}</StyledText>
                        </View>
                    </TouchableHighlight>
                </View>
                <View style={{marginTop: 24}}>
                    <StyledText style={styles.settingsLabel}>{i18n.t('debug')}</StyledText>
                </View>
                <View style={[styles.settingsContainer]}>
                    <TouchableHighlight
                        onPress={() => { 
                            Alert.alert(i18n.t('clearCacheConfirmation'), i18n.t('clearCacheConfirmationMessage'), [
                                {
                                    text: i18n.t('cancel'),
                                    onPress: () => {
                                        
                                    },
                                    style: 'cancel',
                                    isPreferred: true
                                },
                                {
                                    text: i18n.t('clear'),
                                    onPress: () => {
                                        clearCache();
                                    },
                                    style: 'destructive'
                                },
                            ]);
                        }}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <StyledText style={styles.destructiveSettingsText}>{i18n.t('clearCache')}</StyledText>
                        </View>
                    </TouchableHighlight>
                    <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                    <TouchableHighlight
                        onPress={() => {
                            Alert.alert(i18n.t('deleteHymnalsConfirmation'), i18n.t('deleteHymnalsConfirmationMessage'), [
                                {
                                    text: i18n.t('cancel'),
                                    onPress: () => {
                                        
                                    },
                                    style: 'cancel',
                                    isPreferred: true
                                },
                                {
                                    text: i18n.t('delete'),
                                    onPress: async () => {
                                        // remove progress values
                                        context?.setDownloadProgressValues({});
                                        await deleteAllHymnals();
                                        const books = await loadHymnals();
                                        context?.SET_BOOK_DATA(books);
                                    },
                                    style: 'destructive'
                                },
                            ]);
                        }}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <StyledText style={styles.destructiveSettingsText}>{i18n.t('deleteHymnals')}</StyledText>
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
        destructiveSettingsText: {
            fontSize: 18,
            fontWeight: '400',
            color: Colors[theme].destructive,
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