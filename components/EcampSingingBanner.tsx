import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    LayoutChangeEvent,
    Platform,
    Pressable,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native';
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
import {
    EcampSingingBannerCard,
    EcampSingingBannerStaticViewButton,
} from '@/components/EcampSingingBannerCard';

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
        songKey,
        hymnalLabel,
        songRoute,
        hidden,
        dismissBanner,
    } = useEcampDisplayState();
    const translateY = useSharedValue(0);
    const liquidGlassCapable = useMemo(
        () => isIOS26DesignEnabled()
            && isLiquidGlassAvailable()
            && isGlassEffectAPIAvailable(),
        [],
    );
    const [useLiquidGlass, setUseLiquidGlass] = useState(liquidGlassCapable);
    const glassLayoutConfirmedRef = useRef(false);
    const isVisible = Boolean(display) && !hidden;

    useEffect(() => {
        setUseLiquidGlass(liquidGlassCapable);
        glassLayoutConfirmedRef.current = false;
    }, [liquidGlassCapable, songKey]);

    useEffect(() => {
        if (!liquidGlassCapable) {
            return;
        }

        let cancelled = false;
        AccessibilityInfo.isReduceTransparencyEnabled()
            .then((reduceTransparency) => {
                if (!cancelled && reduceTransparency) {
                    setUseLiquidGlass(false);
                }
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [liquidGlassCapable, songKey]);

    const requestLiquidGlassFallback = useCallback(() => {
        setUseLiquidGlass(false);
    }, []);

    const handleGlassButtonLayout = useCallback((event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        if (width >= 1 && height >= 1) {
            glassLayoutConfirmedRef.current = true;
            return;
        }

        requestLiquidGlassFallback();
    }, [requestLiquidGlassFallback]);

    useEffect(() => {
        if (!useLiquidGlass || !isVisible) {
            return;
        }

        const timeout = setTimeout(() => {
            if (!glassLayoutConfirmedRef.current) {
                requestLiquidGlassFallback();
            }
        }, 400);

        return () => clearTimeout(timeout);
    }, [useLiquidGlass, isVisible, songKey, requestLiquidGlassFallback]);

    useEffect(() => {
        if (isVisible) {
            translateY.value = 0;
        }
    }, [songKey, isVisible, translateY]);

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

        if (useLiquidGlass) {
            return (
                <GlassView
                    isInteractive
                    onLayout={handleGlassButtonLayout}
                    style={styles.liquidGlassButton}
                    glassEffectStyle={
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

        return <EcampSingingBannerStaticViewButton onPress={openSong} />;
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
                    <EcampSingingBannerCard
                        songNumber={display.songNumber}
                        hymnalLabel={hymnalLabel}
                        viewButton={songRoute ? renderViewButton() : null}
                    />
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
    liquidGlassButton: {
        flexShrink: 0,
        alignSelf: 'stretch',
        minHeight: 28,
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
    buttonText: {
        flexShrink: 1,
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'LatoBold',
    },
});
