import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { scheduleOnRN } from 'react-native-worklets';

import StyledText from '@/components/StyledText';
import { isIOS26DesignEnabled } from '@/constants/iosDesign';
import { useEcampDisplayState } from '@/hooks/useEcampDisplayState';
import { useI18n } from '@/hooks/useI18n';
import { useTabBarMediaAccessoryVisible } from '@/hooks/useTabBarMediaAccessoryVisible';
import {
    ECAMP_BANNER_DISMISS_DRAG_THRESHOLD,
    ECAMP_BANNER_DISMISS_OFFSET,
    ECAMP_BANNER_DISMISS_VELOCITY_THRESHOLD,
    getEcampBannerBottomInset,
    isMainTabRoute,
} from '@/constants/ecampBanner';

const CAMP_GRADIENT = ['#6E5A72', '#A393A3', '#F0C9B8', '#FFB74D', '#9A6840'] as const;
const CAMP_GRADIENT_LOCATIONS = [0, 0.28, 0.52, 0.78, 1] as const;

export default function EcampSingingBanner() {
    const i18n = useI18n();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isOpeningSongRef = useRef(false);
    const tabBarMediaAccessoryVisible = useTabBarMediaAccessoryVisible();
    const {
        display,
        displayKey,
        hymnalLabel,
        songRoute,
        hidden,
        dismissBanner,
    } = useEcampDisplayState();
    const translateY = useSharedValue(0);
    const isLiquidGlass = useMemo(
        () => isIOS26DesignEnabled()
            && isLiquidGlassAvailable()
            && isGlassEffectAPIAvailable(),
        [],
    );
    const isVisible = Boolean(display) && !hidden;

    useEffect(() => {
        if (isVisible) {
            translateY.value = 0;
        }
    }, [displayKey, isVisible, translateY]);

    const finishDismiss = useCallback(() => {
        dismissBanner();
    }, [dismissBanner]);

    const panGesture = useMemo(() => Gesture.Pan()
        .enabled(isVisible)
        .activeOffsetY(8)
        .failOffsetX([-24, 24])
        .onUpdate((event) => {
            'worklet';
            if (event.translationY > 0) {
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            'worklet';
            const shouldDismiss = event.translationY > ECAMP_BANNER_DISMISS_DRAG_THRESHOLD
                || event.velocityY > ECAMP_BANNER_DISMISS_VELOCITY_THRESHOLD;

            if (shouldDismiss) {
                scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
                translateY.value = withTiming(
                    ECAMP_BANNER_DISMISS_OFFSET,
                    { duration: 180 },
                    (finished) => {
                        if (finished) {
                            scheduleOnRN(finishDismiss);
                        }
                    },
                );
                return;
            }

            translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        }), [finishDismiss, isVisible, translateY]);

    const dragAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: Math.max(0, 1 - translateY.value / ECAMP_BANNER_DISMISS_OFFSET),
    }));

    const isLandscape = windowWidth > windowHeight;
    const horizontalPadding = 12;
    const cardWidth = isLandscape
        ? Math.min(windowHeight, windowWidth - horizontalPadding * 2)
        : undefined;
    const bottomInset = getEcampBannerBottomInset(insets, {
        isTabRoute: isMainTabRoute(pathname),
        mediaAccessoryVisible: tabBarMediaAccessoryVisible,
    });

    function openSong() {
        if (!songRoute || isOpeningSongRef.current) {
            return;
        }

        isOpeningSongRef.current = true;
        router.push({
            pathname: '/display/[id]/[number]',
            params: {
                id: songRoute.bookId,
                number: songRoute.number,
                ghost: '1',
            },
        });

        setTimeout(() => {
            isOpeningSongRef.current = false;
        }, 400);
    }

    function renderViewButton() {
        const label = i18n.t('viewCurrentSong');

        if (isLiquidGlass) {
            return (
                <GlassView isInteractive style={styles.liquidGlassButton} glassEffectStyle={
                    {
                        style: 'clear',
                        animate: true,
                        animationDuration: 0.3,
                    }
                }>
                    <Pressable
                        onPress={openSong}
                        style={({ pressed }) => [
                            styles.glassButtonInner,
                            pressed && styles.glassButtonPressed,
                        ]}
                    >
                        <StyledText
                            style={styles.buttonText}
                            numberOfLines={1}
                        >
                            {label}
                        </StyledText>
                    </Pressable>
                </GlassView>
            );
        }

        return (
            <Pressable
                onPress={openSong}
                style={({ pressed }) => [
                    styles.button,
                    pressed && styles.buttonPressed,
                ]}
            >
                <StyledText
                    style={styles.buttonText}
                    numberOfLines={1}
                >
                    {label}
                </StyledText>
            </Pressable>
        );
    }

    if (!display) {
        return null;
    }

    return (
        <View
            pointerEvents={isVisible ? 'box-none' : 'none'}
            accessibilityElementsHidden={!isVisible}
            importantForAccessibility={isVisible ? 'auto' : 'no-hide-descendants'}
            collapsable={false}
            style={[
                styles.outer,
                isLandscape && styles.outerLandscape,
                { bottom: bottomInset },
                !isVisible && styles.visuallyHidden,
            ]}
        >
            <GestureDetector gesture={panGesture}>
                <Animated.View
                    style={[
                        isLandscape && styles.landscapeCardWrap,
                        cardWidth != null && { width: cardWidth },
                        dragAnimatedStyle,
                    ]}
                >
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
                                        {display.songNumber}
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
                            {songRoute ? renderViewButton() : null}
                        </View>
                    </LinearGradient>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    outer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 12,
        ...Platform.select({
            android: {
                elevation: 10,
            },
        }),
    },
    outerLandscape: {
        alignItems: 'center',
    },
    landscapeCardWrap: {
        alignSelf: 'center',
    },
    visuallyHidden: {
        opacity: 0,
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
    liquidGlassButton: {
        flexShrink: 0,
        alignSelf: 'stretch',
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glassButton: {
        flexShrink: 0,
        alignSelf: 'stretch',
        borderRadius: 32,
        overflow: 'hidden',
    },
    glassButtonInner: {
        minHeight: 28,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glassButtonPressed: {
        opacity: 0.85,
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
