import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { scheduleOnRN } from 'react-native-worklets';
import StyledText from '@/components/StyledText';
import { Colors } from '@/constants/Colors';

const MAX_OFFSET = 75;

type SheetMusicSwipeFrameProps = {
    theme: 'light' | 'dark';
    isZoomedOut: boolean;
    previousSongNumber?: string;
    nextSongNumber?: string;
    onSwipeToPrevious: () => void;
    onSwipeToNext: () => void;
    children: React.ReactNode;
};

function SongPeekLabel({
    number,
    side,
    theme,
}: {
    number: string;
    side: 'left' | 'right';
    theme: 'light' | 'dark';
}) {
    return (
        <View
            style={[
                styles.peek,
                side === 'left' ? styles.peekLeft : styles.peekRight,
            ]}
        >
            <StyledText
                style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: Colors[theme].text,
                    backgroundColor: Colors[theme].headerBackground,
                    paddingVertical: 16,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    minWidth: 50,
                    textAlign: 'center',
                }}
            >
                {number}
            </StyledText>
        </View>
    );
}

export function SheetMusicSwipeFrame({
    theme,
    isZoomedOut,
    previousSongNumber,
    nextSongNumber,
    onSwipeToPrevious,
    onSwipeToNext,
    children,
}: SheetMusicSwipeFrameProps) {
    const offset = useSharedValue(0);
    const isSwipingRight = useSharedValue(false);
    const isSwipingLeft = useSharedValue(false);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: offset.value }],
    }));

    const iosGestures = useMemo(() => {
        if (Platform.OS !== 'ios') {
            return undefined;
        }

        function haptic() {
            'worklet';
            scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
        }

        return Gesture.Pan()
            .minPointers(1)
            .maxPointers(1)
            .enabled(isZoomedOut)
            .onUpdate((event) => {
                'worklet';
                if (event.translationX > 0) {
                    offset.value = Math.min(event.translationX, MAX_OFFSET);
                } else {
                    offset.value = Math.max(event.translationX, -MAX_OFFSET);
                }
                const distance = Math.abs(offset.value);
                if (distance > MAX_OFFSET / 2) {
                    if (offset.value < 0) {
                        if (!isSwipingLeft.value) {
                            haptic();
                            isSwipingLeft.value = true;
                        }
                    } else if (!isSwipingRight.value) {
                        haptic();
                        isSwipingRight.value = true;
                    }
                } else {
                    if (isSwipingLeft.value || isSwipingRight.value) {
                        haptic();
                    }
                    isSwipingLeft.value = false;
                    isSwipingRight.value = false;
                }
            })
            .onEnd(() => {
                'worklet';
                if (Math.abs(offset.value) > MAX_OFFSET / 2) {
                    if (offset.value > 0) {
                        scheduleOnRN(onSwipeToPrevious);
                    } else {
                        scheduleOnRN(onSwipeToNext);
                    }
                }
                offset.value = withSpring(0, { damping: 100, mass: 0.1 });
            });
    }, [isSwipingLeft, isSwipingRight, isZoomedOut, offset, onSwipeToNext, onSwipeToPrevious]);

    const content = (
        <Animated.View style={[iosGestures ? animatedStyle : undefined, styles.frame]}>
            {previousSongNumber ? (
                <SongPeekLabel number={previousSongNumber} side="left" theme={theme} />
            ) : null}
            {children}
            {nextSongNumber ? (
                <SongPeekLabel number={nextSongNumber} side="right" theme={theme} />
            ) : null}
        </Animated.View>
    );

    if (iosGestures) {
        return <GestureDetector gesture={iosGestures}>{content}</GestureDetector>;
    }

    return content;
}

const styles = StyleSheet.create({
    frame: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    peek: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        justifyContent: 'center',
    },
    peekLeft: {
        left: -60,
    },
    peekRight: {
        right: -60,
    },
});
