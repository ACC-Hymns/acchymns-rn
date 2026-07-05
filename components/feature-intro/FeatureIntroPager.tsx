import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Pressable,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    cancelAnimation,
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { FeatureIntroCampSlide } from '@/components/feature-intro/FeatureIntroCampSlide';
import { FeatureIntroSlide } from '@/components/feature-intro/FeatureIntroSlide';
import StyledText from '@/components/StyledText';
import { Colors } from '@/constants/Colors';
import {
    FEATURE_INTRO_LANGUAGE_CODES,
    FeatureIntroSlideConfig,
} from '@/constants/featureIntro';
import { getLanguageName } from '@/constants/localization';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useI18n } from '@/hooks/useI18n';

const PAGE_SPRING = {
    damping: 22,
    stiffness: 210,
    mass: 0.85,
    overshootClamping: false,
} as const;

type FeatureIntroPagerProps = {
    slides: FeatureIntroSlideConfig[];
    onComplete: () => void;
    onSkip: () => void;
};

function SlideMockContent({ slideId, theme }: { slideId: FeatureIntroSlideConfig['id']; theme: 'light' | 'dark' }) {
    const i18n = useI18n();

    if (slideId === 'languages') {
        return (
            <View style={styles.languageChipRow}>
                {FEATURE_INTRO_LANGUAGE_CODES.map((code) => (
                    <View
                        key={code}
                        style={[styles.languageChip, { backgroundColor: Colors[theme].settingsButton }]}
                    >
                        <StyledText style={[styles.languageChipText, { color: Colors[theme].text }]}>
                            {getLanguageName(code)}
                        </StyledText>
                    </View>
                ))}
            </View>
        );
    }

    if (slideId === 'swipe') {
        return (
            <View style={styles.swipeMock}>
                <View style={[styles.swipeSide, { backgroundColor: Colors[theme].settingsButton }]}>
                    <Ionicons name="chevron-back" size={28} color={Colors[theme].fadedIcon} />
                    <StyledText style={[styles.swipeNumber, { color: Colors[theme].fadedText }]}>141</StyledText>
                </View>
                <View style={[styles.swipeCenter, { backgroundColor: Colors[theme].songBackground, borderColor: Colors[theme].divider }]}>
                    <Ionicons name="musical-notes" size={32} color={Colors[theme].primary} />
                    <StyledText style={[styles.swipeCurrent, { color: Colors[theme].text }]}>142</StyledText>
                </View>
                <View style={[styles.swipeSide, { backgroundColor: Colors[theme].settingsButton }]}>
                    <Ionicons name="chevron-forward" size={28} color={Colors[theme].fadedIcon} />
                    <StyledText style={[styles.swipeNumber, { color: Colors[theme].fadedText }]}>143</StyledText>
                </View>
            </View>
        );
    }

    if (slideId === 'hymnals') {
        return (
            <View style={[styles.hymnalMockRow, { backgroundColor: Colors[theme].settingsButton }]}>
                <View style={styles.hymnalMockText}>
                    <StyledText style={[styles.hymnalMockTitle, { color: Colors[theme].text }]}>Zion&apos;s Harp</StyledText>
                    <StyledText style={[styles.hymnalMockSubtitle, { color: Colors[theme].fadedText }]}>
                        {i18n.t('updateAvailable')}
                    </StyledText>
                </View>
                <View style={[styles.hymnalBadge, { backgroundColor: Colors[theme].primary }]}>
                    <Ionicons name="arrow-down-circle" size={22} color="#fff" />
                </View>
            </View>
        );
    }

    if (slideId === 'discover') {
        return (
            <View style={[styles.discoverMock, { backgroundColor: Colors[theme].settingsButton, borderColor: Colors[theme].divider }]}>
                <Ionicons name="search" size={18} color={Colors[theme].fadedIcon} />
                <StyledText style={[styles.discoverMockText, { color: Colors[theme].fadedText }]}>
                    {i18n.t('promptPlaceholder')}
                </StyledText>
            </View>
        );
    }

    return null;
}

function PageDot({
    index,
    activePage,
    activeColor,
    inactiveColor,
}: {
    index: number;
    activePage: SharedValue<number>;
    activeColor: string;
    inactiveColor: string;
}) {
    const dotStyle = useAnimatedStyle(() => {
        const distance = Math.abs(activePage.value - index);
        return {
            width: interpolate(distance, [0, 0.6, 1], [20, 12, 8], Extrapolation.CLAMP),
            opacity: interpolate(distance, [0, 1], [1, 0.35], Extrapolation.CLAMP),
            backgroundColor: distance < 0.5 ? activeColor : inactiveColor,
        };
    });

    return <Animated.View style={[styles.dot, dotStyle]} />;
}

export function FeatureIntroPager({ slides, onComplete, onSkip }: FeatureIntroPagerProps) {
    const theme = useColorScheme() ?? 'light';
    const i18n = useI18n();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const slideCount = slides.length;

    const targetPageRef = useRef(0);
    const [pageIndex, setPageIndex] = useState(0);

    const pageWidth = useSharedValue(width);
    const translateX = useSharedValue(0);
    const activePage = useSharedValue(0);
    const panStartX = useSharedValue(0);

    const springToPage = useCallback((index: number) => {
        const clamped = Math.max(0, Math.min(slideCount - 1, index));
        targetPageRef.current = clamped;
        setPageIndex(clamped);
        activePage.value = clamped;
        cancelAnimation(translateX);
        translateX.value = withSpring(-clamped * width, PAGE_SPRING);
    }, [activePage, slideCount, translateX, width]);

    useEffect(() => {
        pageWidth.value = width;
        cancelAnimation(translateX);
        activePage.value = targetPageRef.current;
        translateX.value = withSpring(-targetPageRef.current * width, PAGE_SPRING);
    }, [width, pageWidth, translateX, activePage]);

    const panGesture = useMemo(() => Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-16, 16])
        .onBegin(() => {
            cancelAnimation(translateX);
            panStartX.value = translateX.value;
        })
        .onUpdate((event) => {
            const minX = -(slideCount - 1) * pageWidth.value;
            const next = panStartX.value + event.translationX;
            translateX.value = Math.max(minX, Math.min(0, next));
            activePage.value = -translateX.value / pageWidth.value;
        })
        .onEnd((event) => {
            const projected = translateX.value + event.velocityX * 0.12;
            const target = Math.round(-projected / pageWidth.value);
            const clamped = Math.max(0, Math.min(slideCount - 1, target));
            runOnJS(springToPage)(clamped);
        }), [activePage, pageWidth, panStartX, slideCount, springToPage, translateX]);

    const trackStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const isLastPage = pageIndex >= slideCount - 1;

    const handlePrimaryAction = useCallback(() => {
        if (targetPageRef.current >= slideCount - 1) {
            onComplete();
            return;
        }
        springToPage(targetPageRef.current + 1);
    }, [onComplete, slideCount, springToPage]);

    const renderSlideContent = useCallback((item: FeatureIntroSlideConfig) => {
        const title = i18n.t(item.titleKey);
        const body = i18n.t(item.bodyKey);

        if (item.id === 'camp') {
            return (
                <FeatureIntroCampSlide
                    icon={item.icon}
                    gradient={item.gradient}
                    title={title}
                    body={body}
                />
            );
        }

        return (
            <FeatureIntroSlide icon={item.icon} gradient={item.gradient} title={title} body={body}>
                <SlideMockContent slideId={item.id} theme={theme} />
            </FeatureIntroSlide>
        );
    }, [i18n, theme]);

    return (
        <View style={[styles.root, { backgroundColor: Colors[theme].background }]}>
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                <View style={styles.topBarSpacer} />
                <Pressable onPress={onSkip} hitSlop={12} accessibilityRole="button">
                    <StyledText style={[styles.skipText, { color: Colors[theme].primary }]}>
                        {i18n.t('featureIntroSkip')}
                    </StyledText>
                </Pressable>
            </View>

            <View style={styles.pagerViewport}>
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[styles.track, { width: width * slideCount }, trackStyle]}>
                        {slides.map((item) => (
                            <View key={item.id} style={[styles.slide, { width }]}>
                                {renderSlideContent(item)}
                            </View>
                        ))}
                    </Animated.View>
                </GestureDetector>
            </View>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.dots}>
                    {slides.map((slide, index) => (
                        <PageDot
                            key={slide.id}
                            index={index}
                            activePage={activePage}
                            activeColor={Colors[theme].primary}
                            inactiveColor={Colors[theme].fadedIcon}
                        />
                    ))}
                </View>

                <Pressable
                    onPress={handlePrimaryAction}
                    style={[styles.primaryButton, { backgroundColor: Colors[theme].primary }]}
                    accessibilityRole="button"
                >
                    <StyledText style={styles.primaryButtonText}>
                        {isLastPage ? i18n.t('featureIntroGetStarted') : i18n.t('featureIntroNext')}
                    </StyledText>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingBottom: 4,
    },
    topBarSpacer: {
        flex: 1,
    },
    skipText: {
        fontSize: 16,
        fontFamily: 'LatoRegular',
    },
    pagerViewport: {
        flex: 1,
        overflow: 'hidden',
    },
    track: {
        flexDirection: 'row',
        flex: 1,
    },
    slide: {
        flex: 1,
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 8,
        gap: 20,
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    primaryButton: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 17,
        fontFamily: 'LatoBold',
    },
    languageChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        maxWidth: 300,
    },
    languageChip: {
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    languageChipText: {
        fontSize: 12,
        fontFamily: 'LatoRegular',
    },
    swipeMock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    swipeSide: {
        width: 56,
        height: 72,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    swipeCenter: {
        width: 88,
        height: 112,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    swipeNumber: {
        fontSize: 12,
        fontFamily: 'LatoRegular',
    },
    swipeCurrent: {
        fontSize: 20,
        fontFamily: 'LatoBold',
    },
    hymnalMockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 14,
        width: '100%',
        maxWidth: 300,
    },
    hymnalMockText: {
        flex: 1,
    },
    hymnalMockTitle: {
        fontSize: 16,
        fontFamily: 'LatoBold',
    },
    hymnalMockSubtitle: {
        fontSize: 13,
        fontFamily: 'LatoRegular',
        marginTop: 2,
    },
    hymnalBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    discoverMock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        width: '100%',
        maxWidth: 300,
    },
    discoverMockText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'LatoRegular',
    },
});
