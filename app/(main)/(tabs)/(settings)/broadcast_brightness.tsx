import { Colors } from '@/constants/Colors';
import {
    DEFAULT_HYMNSIGN_LARGE_BRIGHTNESS,
    DEFAULT_HYMNSIGN_SMALL_BRIGHTNESS,
    HYMNSIGN_BRIGHTNESS_MAX,
} from '@/constants/displayCommand';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { router, useNavigation } from 'expo-router';
import React, { useContext, useLayoutEffect, useState } from 'react';
import { HymnalContext } from '@/constants/context';
import { useI18n } from '@/hooks/useI18n';
import { useColorScheme } from '@/hooks/useColorScheme';
import StyledText from '@/components/StyledText';
import Ionicons from '@react-native-vector-icons/ionicons';
import Slider from '@react-native-community/slider';
import { canPublishBroadcast, publishFromContext } from '@/scripts/broadcastPublish';
import { createBrightnessCommand } from '@/scripts/displayCommand';
import { isIOS26DesignDisabled } from '@/constants/iosDesign';

export default function BroadcastBrightnessScreen() {
    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);
    const navigation = useNavigation();
    const context = useContext(HymnalContext);
    const i18n = useI18n();

    const [largeBrightness, setLargeBrightness] = useState(DEFAULT_HYMNSIGN_LARGE_BRIGHTNESS);
    const [smallBrightness, setSmallBrightness] = useState(DEFAULT_HYMNSIGN_SMALL_BRIGHTNESS);

    useLayoutEffect(() => {
        if (isIOS26DesignDisabled()) {
            navigation.setOptions({
                unstable_headerLeftItems: () => [
                    {
                        type: 'button',
                        label: 'Back',
                        icon: {
                            type: 'sfSymbol',
                            name: 'chevron.left',
                        },
                        tintColor: Colors[theme].icon,
                        onPress: () => {
                            router.back();
                        },
                    },
                ],
            });
        }
    }, []);

    async function sendBrightness() {
        if (!canPublishBroadcast(context)) {
            return;
        }

        await publishFromContext(
            context,
            createBrightnessCommand(
                Math.round(largeBrightness),
                Math.round(smallBrightness),
            ),
            i18n,
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: Colors[theme].background }}>
            <ScrollView style={styles.scrollView}>
                <View style={styles.settingsContainer}>
                    <View style={styles.sliderSection}>
                        <View style={styles.sliderHeader}>
                            <StyledText style={styles.settingsText}>{i18n.t('hymnSignLargeBrightness')}</StyledText>
                            <StyledText style={styles.brightnessValue}>{Math.round(largeBrightness)}</StyledText>
                        </View>
                        <Slider
                            value={largeBrightness}
                            minimumValue={0}
                            maximumValue={HYMNSIGN_BRIGHTNESS_MAX}
                            step={1}
                            onValueChange={setLargeBrightness}
                            minimumTrackTintColor={Colors[theme].tint}
                            maximumTrackTintColor={Colors[theme].border}
                            thumbTintColor={Colors[theme].tint}
                        />
                    </View>
                    <View style={styles.sliderSection}>
                        <View style={styles.sliderHeader}>
                            <StyledText style={styles.settingsText}>{i18n.t('hymnSignSmallBrightness')}</StyledText>
                            <StyledText style={styles.brightnessValue}>{Math.round(smallBrightness)}</StyledText>
                        </View>
                        <Slider
                            value={smallBrightness}
                            minimumValue={0}
                            maximumValue={HYMNSIGN_BRIGHTNESS_MAX}
                            step={1}
                            onValueChange={setSmallBrightness}
                            minimumTrackTintColor={Colors[theme].tint}
                            maximumTrackTintColor={Colors[theme].border}
                            thumbTintColor={Colors[theme].tint}
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.sendButton} onPress={sendBrightness}>
                    <Ionicons name="send" size={18} color="white" />
                    <StyledText style={styles.sendButtonLabel}>{i18n.t('send')}</StyledText>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

function makeStyles(theme: 'light' | 'dark') {
    return StyleSheet.create({
        scrollView: {
            flex: 1,
            width: '100%',
            paddingTop: 140,
            paddingBottom: 15,
            paddingHorizontal: 20,
        },
        settingsContainer: {
            backgroundColor: Colors[theme].settingsButton,
            borderRadius: 12,
            overflow: 'hidden',
        },
        sliderSection: {
            paddingHorizontal: 20,
            paddingVertical: 16,
        },
        sliderHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
        },
        settingsText: {
            fontSize: 18,
            fontWeight: '400',
            color: Colors[theme].text,
            fontFamily: 'Lato',
        },
        brightnessValue: {
            fontSize: 18,
            fontWeight: '600',
            color: Colors[theme].fadedText,
            fontFamily: 'Lato',
            minWidth: 36,
            textAlign: 'right',
        },
        sendButton: {
            backgroundColor: Colors[theme].primary,
            paddingVertical: 15,
            paddingHorizontal: 24,
            borderRadius: 15,
            flexDirection: 'row',
            gap: 8,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 40,
            alignSelf: 'center',
        },
        sendButtonLabel: {
            color: 'white',
            fontSize: 16,
            fontWeight: '600',
            fontFamily: 'Lato',
        },
    });
}
