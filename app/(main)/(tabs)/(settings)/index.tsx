import { Colors } from '@/constants/Colors';
import { StyleSheet, ScrollView, View, TouchableHighlight, Pressable, Alert } from 'react-native';
import React, { useCallback, useContext } from 'react';
import { useRouterPushOnce } from '@/hooks/useRouterPushOnce';
import { SettingsDivider as Divider } from '@/components/SettingsDivider';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as Haptics from 'expo-haptics';
import { HymnalContext } from '@/constants/context';
import { useI18n } from '@/hooks/useI18n';
import { useColorScheme } from '@/hooks/useColorScheme';
import StyledText from '@/components/StyledText';
import Ionicons from '@react-native-vector-icons/ionicons';
import HymnalUpdateBadge from '@/components/HymnalUpdateBadge';
import { isDeveloperSettingsEnabled } from '@/constants/build';

const DEVELOPER_MODE_HOLD_MS = 5000;

export default function SettingsScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);
    const push = useRouterPushOnce();
    const context = useContext(HymnalContext);

    const i18n = useI18n();
    const updateIdSegment = Updates.updateId?.split('-')[0];
    const developerModeEnabled = isDeveloperSettingsEnabled(context?.developerMode);

    const handleToggleDeveloperMode = useCallback(() => {
        const nextValue = !developerModeEnabled;
        context?.setDeveloperMode(nextValue);
        Haptics.notificationAsync(
            nextValue
                ? Haptics.NotificationFeedbackType.Success
                : Haptics.NotificationFeedbackType.Warning,
        );
        Alert.alert(
            nextValue ? i18n.t('developerModeEnabled') : i18n.t('developerModeDisabled'),
        );
    }, [context, developerModeEnabled, i18n]);

    return (
        <View style={{ flex: 1, backgroundColor: Colors[theme]['background'] }}>
            <ScrollView 
            contentInsetAdjustmentBehavior='always'
            style={styles.scrollView}>
                <View style={styles.titleContainer}>
                    <StyledText style={styles.textStyle}>{i18n.t('settings')}</StyledText>
                </View>
                <View>
                    <StyledText style={styles.settingsLabel}>{i18n.t('info')}</StyledText>
                </View>
                <View style={[styles.settingsContainer]}>
                    <Pressable
                        onLongPress={handleToggleDeveloperMode}
                        delayLongPress={DEVELOPER_MODE_HOLD_MS}
                    >
                        <View style={styles.settingsItem}>
                            <StyledText style={styles.settingsText}>{i18n.t('appVersion')}</StyledText>
                            <StyledText style={[styles.settingsText, { color: Colors[theme].fadedText }]}>{Constants.expoConfig?.version}</StyledText>
                        </View>
                    </Pressable>
                    <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                    <TouchableHighlight
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <StyledText style={styles.settingsText}>{i18n.t('updateId')}</StyledText>
                            <StyledText style={[styles.settingsText, { color: Colors[theme].fadedText }]}>{updateIdSegment}</StyledText>
                        </View>
                    </TouchableHighlight>
                    <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                    <TouchableHighlight
                        onPress={() => push('/(main)/(tabs)/(settings)/help')}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <StyledText style={styles.settingsText}>{i18n.t('help')}</StyledText>
                            <Ionicons name="chevron-forward-outline" size={14} color={Colors[theme].fadedIcon} />
                        </View>
                    </TouchableHighlight>
                </View>
                <View style={{ marginTop: 24 }}>
                    <StyledText style={styles.settingsLabel}>{i18n.t('general')}</StyledText>
                </View>
                <View style={[styles.settingsContainer]}>
                    <TouchableHighlight
                        onPress={() => push('/hymnal_importer')}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <StyledText style={styles.settingsText}>{i18n.t('addHymnal')}</StyledText>
                            <HymnalUpdateBadge />
                        </View>
                    </TouchableHighlight>
                    <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                    <TouchableHighlight
                        style={styles.settingsItem}
                        onPress={() => push('/broadcast')}
                        underlayColor={Colors[theme].divider}
                    >
                        <StyledText style={styles.settingsText}>{i18n.t('broadcast')}</StyledText>
                    </TouchableHighlight>
                    <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                    <TouchableHighlight
                        onPress={() => push('/(main)/(tabs)/(settings)/preferences')}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <StyledText style={styles.settingsText}>{i18n.t('preferences')}</StyledText>
                            <Ionicons name="chevron-forward-outline" size={14} color={Colors[theme].fadedIcon} />
                        </View>
                    </TouchableHighlight>
                </View>
                {developerModeEnabled && (
                    <>
                        <View style={{ marginTop: 24 }}>
                            <StyledText style={styles.settingsLabel}>{i18n.t('developer')}</StyledText>
                        </View>
                        <View style={[styles.settingsContainer]}>
                            <TouchableHighlight
                                onPress={() => push('/(main)/(tabs)/(settings)/developer')}
                                underlayColor={Colors[theme].divider}
                            >
                                <View style={styles.settingsItem}>
                                    <StyledText style={styles.settingsText}>{i18n.t('developerSettings')}</StyledText>
                                    <Ionicons name="chevron-forward-outline" size={14} color={Colors[theme].fadedIcon} />
                                </View>
                            </TouchableHighlight>
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        settingsLabel: {
            fontSize: 14,
            fontWeight: '400',
            color: Colors[theme]['fadedText'],
            fontFamily: 'Lato',
            marginLeft: 20,
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
            paddingHorizontal: 20,
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
            fontWeight: '700',
            fontFamily: 'Lato',
            textAlign: 'center'
        },
        titleContainer: {
            marginTop: 18,
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