import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import StyledText from '@/components/StyledText';
import { useI18n } from '@/hooks/useI18n';

export const CAMP_GRADIENT = ['#6E5A72', '#A393A3', '#F0C9B8', '#FFB74D', '#9A6840'] as const;
export const CAMP_GRADIENT_LOCATIONS = [0, 0.28, 0.52, 0.78, 1] as const;

type EcampSingingBannerCardProps = {
    songNumber: string | number;
    hymnalLabel: string | null;
    viewButton?: React.ReactNode;
};

export function EcampSingingBannerStaticViewButton({ onPress }: { onPress?: () => void }) {
    const i18n = useI18n();
    const label = i18n.t('viewCurrentSong');

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.button,
                    pressed && styles.buttonPressed,
                ]}
            >
                <StyledText style={styles.buttonText} numberOfLines={1}>
                    {label}
                </StyledText>
            </Pressable>
        );
    }

    return (
        <View style={styles.button}>
            <StyledText style={styles.buttonText} numberOfLines={1}>
                {label}
            </StyledText>
        </View>
    );
}

export function EcampSingingBannerCard({
    songNumber,
    hymnalLabel,
    viewButton,
}: EcampSingingBannerCardProps) {
    const i18n = useI18n();

    return (
        <LinearGradient
            colors={[...CAMP_GRADIENT]}
            locations={[...CAMP_GRADIENT_LOCATIONS]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
        >
            <View style={styles.content} collapsable={false}>
                <View style={styles.textBlock} collapsable={false}>
                    <StyledText style={styles.eventHeader}>
                        {i18n.t('easternCamp2026')}
                    </StyledText>
                    <View style={styles.songRow}>
                        <StyledText style={styles.number}>
                            {songNumber}
                        </StyledText>
                        <StyledText
                            style={[
                                styles.hymnal,
                                !hymnalLabel && styles.hymnalPlaceholder,
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {hymnalLabel ?? ' '}
                        </StyledText>
                    </View>
                </View>
                {viewButton}
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
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
    hymnalPlaceholder: {
        opacity: 0,
    },
    button: {
        flexShrink: 0,
        alignSelf: 'stretch',
        minHeight: 28,
        paddingHorizontal: 12,
        borderRadius: 32,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.45)',
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonPressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.28)',
    },
    buttonText: {
        flexShrink: 1,
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'LatoBold',
    },
});
