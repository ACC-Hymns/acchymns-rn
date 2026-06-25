import { Colors } from '@/constants/Colors';
import { StyleSheet, ScrollView, View, TouchableHighlight, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import React, { useContext, useLayoutEffect, useState } from 'react';
import { Divider } from 'react-native-elements';
import { HymnalContext } from '@/constants/context';
import {
    ECAMP_HYMNSIGN_HOST,
    getHymnSignHostForChurch,
    getHymnSignPortForChurch,
    isEcampHymnSignChurch,
} from '@/constants/broadcastAuth';
import { useI18n } from '@/hooks/useI18n';
import { useRouterPushOnce } from '@/hooks/useRouterPushOnce';
import { useColorScheme } from '@/hooks/useColorScheme';
import StyledText from '@/components/StyledText';
import { isIOS26DesignDisabled } from '@/constants/iosDesign';
import Ionicons from '@react-native-vector-icons/ionicons';
import { createClearCommand } from '@/scripts/displayCommand';
import { publishFromContext } from '@/scripts/broadcastPublish';
import { testHymnSignConnection } from '@/scripts/hymnSign';

export default function BroadcastOptionsScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);
    const router = useRouter();
    const push = useRouterPushOnce();
    const context = useContext(HymnalContext);
    const navigation = useNavigation();
    const [testingConnection, setTestingConnection] = useState(false);

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

    const i18n = useI18n();
    const showHymnSignSettings = isEcampHymnSignChurch(context?.broadcastingChurch);
    const hymnSignHost = getHymnSignHostForChurch(context?.broadcastingChurch, context?.hymnSignHost) ?? '';
    const hymnSignPort = getHymnSignPortForChurch(context?.hymnSignPort);

    function signout() {
        context?.setBroadcastingToken(null);
        context?.setBroadcastingChurch(null);
        router.replace('/(main)/(tabs)/(settings)/broadcast');
    }

    async function clear() {
        await publishFromContext(context, createClearCommand(true), i18n);
    }

    async function handleTestConnection() {
        const host = hymnSignHost.trim();
        if (!host) {
            Alert.alert(i18n.t('hymnSignConnectionFailed'), i18n.t('hymnSignHostPlaceholder'));
            return;
        }

        setTestingConnection(true);
        try {
            await testHymnSignConnection(host, hymnSignPort);
            Alert.alert(i18n.t('hymnSignConnectionSuccess'));
        } catch (error) {
            const message = error instanceof Error ? error.message : i18n.t('hymnSignConnectionFailed');
            Alert.alert(i18n.t('hymnSignConnectionFailed'), message);
        } finally {
            setTestingConnection(false);
        }
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

                    {showHymnSignSettings && (
                        <>
                            <View style={{ marginTop: 24 }}>
                                <StyledText style={styles.settingsLabel}>{i18n.t('hymnSignSettings')}</StyledText>
                            </View>
                            <View style={[styles.settingsContainer]}>
                                <View style={styles.settingsItem}>
                                    <StyledText style={styles.settingsText}>{i18n.t('hymnSignHost')}</StyledText>
                                    <TextInput
                                        value={context?.hymnSignHost ?? ''}
                                        onChangeText={(value) => context?.setHymnSignHost(value.trim() === '' ? null : value)}
                                        placeholder={ECAMP_HYMNSIGN_HOST}
                                        placeholderTextColor={Colors[theme].fadedText}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        keyboardType="numbers-and-punctuation"
                                        style={[styles.settingsText, styles.hostInput, { color: Colors[theme].text }]}
                                    />
                                </View>
                                <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                                <View style={styles.settingsItem}>
                                    <StyledText style={styles.settingsText}>{i18n.t('hymnSignPort')}</StyledText>
                                    <TextInput
                                        value={String(hymnSignPort)}
                                        onChangeText={(value) => {
                                            const parsed = Number.parseInt(value, 10);
                                            if (Number.isFinite(parsed) && parsed > 0) {
                                                context?.setHymnSignPort(parsed);
                                            }
                                        }}
                                        placeholder="81"
                                        placeholderTextColor={Colors[theme].fadedText}
                                        keyboardType="number-pad"
                                        style={[styles.settingsText, styles.portInput, { color: Colors[theme].text }]}
                                    />
                                </View>
                                <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                                <TouchableHighlight
                                    onPress={handleTestConnection}
                                    underlayColor={Colors[theme].divider}
                                    disabled={testingConnection}
                                >
                                    <View style={styles.settingsItem}>
                                        <StyledText style={styles.settingsText}>{i18n.t('testHymnSignConnection')}</StyledText>
                                        {testingConnection ? (
                                            <ActivityIndicator color={Colors[theme].primary} />
                                        ) : (
                                            <Ionicons name="wifi-outline" size={18} color={Colors[theme].fadedIcon} />
                                        )}
                                    </View>
                                </TouchableHighlight>
                            </View>
                            <StyledText style={styles.noteText}>{i18n.t('hymnSignWifiNote')}</StyledText>
                        </>
                    )}

                    <View style={{ marginTop: 24 }}>
                        <StyledText style={styles.settingsLabel}>{i18n.t('actions')}</StyledText>
                    </View>
                    <View style={[styles.settingsContainer]}>
                        <TouchableHighlight
                            onPress={() => push('/(main)/(tabs)/(settings)/broadcast_song')}
                            underlayColor={Colors[theme].divider}
                        >
                            <View style={styles.settingsItem}>
                                <StyledText style={styles.settingsText}>{i18n.t('setSongNumber')}</StyledText>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="chevron-forward-outline" size={14} color={Colors[theme].fadedIcon} />
                                </View>
                            </View>
                        </TouchableHighlight>
                        {!showHymnSignSettings && (
                            <>
                                <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                                <TouchableHighlight
                                    onPress={() => push('/(main)/(tabs)/(settings)/broadcast_bible')}
                                    underlayColor={Colors[theme].divider}
                                >
                                    <View style={styles.settingsItem}>
                                        <StyledText style={styles.settingsText}>{i18n.t('setBibleReading')}</StyledText>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Ionicons name="chevron-forward-outline" size={14} color={Colors[theme].fadedIcon} />
                                        </View>
                                    </View>
                                </TouchableHighlight>
                            </>
                        )}
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
        hostInput: {
            minWidth: 140,
            textAlign: 'right',
            paddingVertical: 0,
        },
        portInput: {
            minWidth: 64,
            textAlign: 'right',
            paddingVertical: 0,
        },
        noteText: {
            fontSize: 14,
            color: Colors[theme].fadedText,
            fontFamily: 'Lato',
            marginHorizontal: 20,
            marginTop: 8,
        },
        scrollView: {
            flex: 1,
            width: '100%',
            paddingTop: 140,
            paddingBottom: 15,
            paddingRight: 20,
            paddingLeft: 20,
        },
    });

};
