import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import StyledText from '@/components/StyledText';
import { StyleProp, ViewStyle } from 'react-native';

interface GenericGradientButtonProps {
    onPress?: () => void;
    onLongPress?: () => void;
    primaryColor: string;
    secondaryColor: string;
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

const GenericGradientButton: React.FC<GenericGradientButtonProps> = ({
    onPress,
    onLongPress,
    primaryColor,
    secondaryColor,
    style,
    children
}) => {
    // save press duration to state
    const [pressStart, setPressStart] = React.useState<number | null>(null);

    return (
            <TouchableOpacity
                onPress={() => {
                    // check press duration
                    onPress?.();
                }}
                onLongPress={onLongPress}
                style={[style, styles.buttonContainer]}
            >
                <LinearGradient
                    colors={[primaryColor, secondaryColor]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.gradient]}
                >
                    {children}
                </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    buttonContainer: {
        borderRadius: 16,
        justifyContent: 'center',
    },
    gradient: {
        borderRadius: 16,
        alignItems: 'flex-start',
        justifyContent: 'center',
        flex: 1
    },
    buttonText: {
        color: '#fff',
        fontSize: 23,
        fontWeight: 'bold',
    },
});

export default GenericGradientButton;