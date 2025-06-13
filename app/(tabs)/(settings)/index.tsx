import { Colors } from '@/constants/Colors';
import { Text, StyleSheet, SafeAreaView, ScrollView, View, useColorScheme, TouchableHighlight } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Divider } from 'react-native-elements';
import Constants from 'expo-constants';
import { HymnalContext } from '@/constants/context';
import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import { translations } from '@/constants/localization';

export default function SettingsScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const router = useRouter();
    const context = useContext(HymnalContext);

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    return (
        <>
            <View style={{ flex: 1, backgroundColor: Colors[theme]['background'] }}>
                <ScrollView style={styles.scrollView}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.textStyle}>{i18n.t('settings')}</Text>
                    </View>
                    <View style={{ marginTop: 20 }}>
                        <Text style={styles.settingsLabel}>{i18n.t('info')}</Text>
                    </View>
                    <View style={[styles.settingsContainer]}>
                        <TouchableHighlight
                            underlayColor={Colors[theme].divider}
                        >
                            <View style={styles.settingsItem}>
                                <Text style={styles.settingsText}>{i18n.t('appVersion')}</Text>
                                <Text style={[styles.settingsText, { color: Colors[theme].fadedText }]}>{Constants.expoConfig?.version}</Text>
                            </View>
                        </TouchableHighlight>
                        <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                        <TouchableHighlight
                            onPress={() => router.push('/(tabs)/(settings)/help')}
                            underlayColor={Colors[theme].divider}
                        >
                            <View style={styles.settingsItem}>
                                <Text style={styles.settingsText}>{i18n.t('help')}</Text>
                                <IconSymbol name="chevron.right" size={14} weight='bold' color={Colors[theme].fadedIcon} />
                            </View>
                        </TouchableHighlight>
                    </View>
                    <View style={{ marginTop: 24 }}>
                        <Text style={styles.settingsLabel}>{i18n.t('general')}</Text>
                    </View>
                    <View style={[styles.settingsContainer]}>
                        <TouchableHighlight
                            style={styles.settingsItem}
                            onPress={() => router.push('/hymnal_importer')}
                            underlayColor={Colors[theme].divider}
                        >
                            <Text style={styles.settingsText}>{i18n.t('addHymnal')}</Text>
                        </TouchableHighlight>
                        <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                        <TouchableHighlight
                            onPress={() => router.push('/(tabs)/(settings)/preferences')}
                            underlayColor={Colors[theme].divider}
                        >
                            <View style={styles.settingsItem}>
                                <Text style={styles.settingsText}>{i18n.t('preferences')}</Text>
                                <IconSymbol name="chevron.right" size={14} weight='bold' color={Colors[theme].fadedIcon} />
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

        scrollView: {
            flex: 1,
            width: '100%',
            paddingTop: 15,
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