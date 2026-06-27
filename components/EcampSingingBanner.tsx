import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import StyledText from '@/components/StyledText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useEcampDisplayState } from '@/hooks/useEcampDisplayState';
import { useI18n } from '@/hooks/useI18n';

const CAMP_GRADIENT = ['#6E5A72', '#A393A3', '#F0C9B8', '#FFB74D', '#9A6840'] as const;
const CAMP_GRADIENT_LOCATIONS = [0, 0.28, 0.52, 0.78, 1] as const;

export default function EcampSingingBanner() {
    const theme = useColorScheme() ?? 'light';
    const i18n = useI18n();
    const insets = useSafeAreaInsets();
    const { display, hymnalLabel, songRoute, hidden } = useEcampDisplayState();

    if (!display) {
        return null;
    }

    const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 8 : 0) + 4;

    function openSong() {
        if (!songRoute) {
            return;
        }

        router.push({
            pathname: '/display/[id]/[number]',
            params: {
                id: songRoute.bookId,
                number: songRoute.number,
            },
        });
    }

    return (
        <View
            pointerEvents={hidden ? 'none' : 'box-none'}
            style={[
                styles.outer,
                hidden && styles.hidden,
                {
                    paddingTop: hidden ? 0 : topPadding,
                    backgroundColor: Colors[theme].background,
                },
            ]}
        >
            <LinearGradient
                colors={[...CAMP_GRADIENT]}
                locations={[...CAMP_GRADIENT_LOCATIONS]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
            >
                <View style={styles.content}>
                    <View style={styles.textBlock}>
                        <StyledText style={styles.eventHeader}>
                            {i18n.t('easternCamp2026')}
                        </StyledText>
                        <View style={styles.songRow}>
                            <StyledText style={styles.number}>
                                {display.songNumber}
                            </StyledText>
                            {hymnalLabel ? (
                                <StyledText
                                    style={styles.hymnal}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {hymnalLabel}
                                </StyledText>
                            ) : null}
                        </View>
                    </View>
                    {songRoute ? (
                        <Pressable
                            onPress={openSong}
                            style={({ pressed }) => [
                                styles.button,
                                pressed && styles.buttonPressed,
                            ]}
                        >
                            <StyledText style={styles.buttonText}>
                                {i18n.t('viewCurrentSong')}
                            </StyledText>
                            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                        </Pressable>
                    ) : null}
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    outer: {
        zIndex: 10,
        paddingHorizontal: 12,
        paddingBottom: 6,
        ...Platform.select({
            android: {
                elevation: 10,
            },
        }),
    },
    hidden: {
        height: 0,
        maxHeight: 0,
        overflow: 'hidden',
        opacity: 0,
        paddingBottom: 0,
    },
    card: {
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#3E2723',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.18,
                shadowRadius: 6,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: 44,
    },
    textBlock: {
        flex: 1,
        minWidth: 0,
        gap: 4,
    },
    eventHeader: {
        color: '#FFFFFF',
        fontSize: 11,
        fontFamily: 'Lato',
        lineHeight: 14,
        letterSpacing: 2.5,
        textTransform: 'uppercase',
    },
    songRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    number: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'LatoBold',
        lineHeight: 20,
    },
    hymnal: {
        flex: 1,
        minWidth: 0,
        color: 'rgba(255, 255, 255, 0.82)',
        fontSize: 13,
        fontFamily: 'LatoBold',
        lineHeight: 18,
    },
    button: {
        flexShrink: 0,
        alignSelf: 'stretch',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        minHeight: 28,
        paddingHorizontal: 12,
        borderRadius: 32,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.45)',
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
    },
    buttonPressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.28)',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'LatoBold',
    },
});
