import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors } from '@/constants/Colors';

export const BACK_TO_TOP_BUTTON_SIZE = 48;
export const BACK_TO_TOP_BUTTON_MARGIN_RIGHT = 20;
export const BACK_TO_TOP_BUTTON_MARGIN_BOTTOM = 24;

type DisplayBackToTopButtonProps = {
    visible: boolean;
    theme: 'light' | 'dark';
    bottom: number;
    isLiquidGlass: boolean;
    onPress: () => void;
};

export function DisplayBackToTopButton({
    visible,
    theme,
    bottom,
    isLiquidGlass,
    onPress,
}: DisplayBackToTopButtonProps) {
    if (!visible) return null;

    if (isLiquidGlass) {
        return (
            <GlassView
                style={[styles.container, { bottom }]}
                isInteractive
            >
                <TouchableOpacity
                    style={styles.button}
                    onPress={onPress}
                    activeOpacity={0.9}
                >
                    <Ionicons name="chevron-up" size={22} color={Colors[theme].icon} />
                </TouchableOpacity>
            </GlassView>
        );
    }

    return (
        <View
            style={[styles.container, { bottom }]}
            pointerEvents="auto"
        >
            <TouchableOpacity
                style={[
                    styles.button,
                    { backgroundColor: Colors[theme].settingsButton },
                ]}
                onPress={onPress}
                activeOpacity={0.9}
            >
                <Ionicons name="chevron-up" size={22} color={Colors[theme].icon} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: BACK_TO_TOP_BUTTON_MARGIN_RIGHT,
        width: BACK_TO_TOP_BUTTON_SIZE,
        height: BACK_TO_TOP_BUTTON_SIZE,
        borderRadius: BACK_TO_TOP_BUTTON_SIZE / 2,
    },
    button: {
        width: BACK_TO_TOP_BUTTON_SIZE,
        height: BACK_TO_TOP_BUTTON_SIZE,
        borderRadius: BACK_TO_TOP_BUTTON_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
});
