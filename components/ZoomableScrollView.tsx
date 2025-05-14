import React from 'react';
import { Dimensions, ScrollView, View, StyleSheet } from 'react-native';
import {
    GestureDetector,
    Gesture,
} from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MIN_SCALE = 1;
const MAX_SCALE = 3;

interface ZoomableScrollViewProps {
    children: React.ReactNode;
    minScale?: number;
    maxScale?: number;
    style?: object;
    scrollContainerStyle?: object;
    verticalScrollContainerStyle?: object;
}

const clamp = (value: number, min: number, max: number) => {
    'worklet';
    return Math.min(Math.max(value, min), max);
};

const ZoomableScrollView: React.FC<ZoomableScrollViewProps> = ({
    children,
    minScale = MIN_SCALE,
    maxScale = MAX_SCALE,
    style = {},
    scrollContainerStyle = {},
    verticalScrollContainerStyle = {},
}) => {
    const scale = useSharedValue(minScale);
    const translationX = useSharedValue(0);
    const translationY = useSharedValue(0);

    // Pinch Gesture
    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            // no-op, scale context not needed
        })
        .onUpdate((e) => {
            scale.value = Math.min(maxScale, Math.max(minScale, e.scale));
        })
        .onEnd(() => {
            if (scale.value < minScale) {
                scale.value = withSpring(minScale);
            }
        });

    const startX = useSharedValue(0);
    const startY = useSharedValue(0);

    // Pan Gesture
    const panGesture = Gesture.Pan()
        .onStart(() => {
            startX.value = translationX.value;
            startY.value = translationY.value;
        })
        .onUpdate((e) => {
            const scaleVal = scale.value;

            const scaledWidth = SCREEN_WIDTH * scaleVal;
            const scaledHeight = SCREEN_HEIGHT * scaleVal;

            const maxX = (scaledWidth - SCREEN_WIDTH) / 2;
            const maxY = (scaledHeight - SCREEN_HEIGHT) / 2;

            const nextX = startX.value + e.translationX;
            const nextY = startY.value + e.translationY;

            translationX.value = clamp(nextX, -maxX, maxX);
            translationY.value = clamp(nextY, -maxY, maxY);
        });

    // Combined Gesture
    const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateX: translationX.value },
            { translateY: translationY.value },
        ],
    }));

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.container, style]}>
                <Animated.View style={[styles.content, animatedStyle]}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={true}
                        contentContainerStyle={[styles.scrollContainer, scrollContainerStyle]}
                    >
                        <ScrollView
                            showsVerticalScrollIndicator={true}
                            contentContainerStyle={[styles.verticalScrollContainer, verticalScrollContainerStyle]}
                        >
                            <View style={styles.htmlContainer}>
                                {children}
                            </View>
                        </ScrollView>
                    </ScrollView>
                </Animated.View>
            </Animated.View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
    },
    verticalScrollContainer: {
        flexGrow: 1,
    },
    htmlContainer: {
        flex: 1,
    },
});

export default ZoomableScrollView;
