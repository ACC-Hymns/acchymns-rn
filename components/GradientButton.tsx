import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import StyledText from '@/components/StyledText';
interface GradientButtonProps {
    title: string;
    onPress?: () => void;
    onLongPress?: () => void;
    primaryColor: string;
    secondaryColor: string;
}

const GradientButton: React.FC<GradientButtonProps> = ({
    title,
    onPress,
    onLongPress,
    primaryColor,
    secondaryColor,
}) => {
    // save press duration to state
    const [pressStart, setPressStart] = React.useState<number | null>(null);

    return (
            <Pressable
                onPress={() => {
                    // check press duration
                    onPress?.();
                }}

                style={({ pressed }) => [
                    styles.buttonContainer,
                    pressed && { opacity: 0.7 },
                ]}
                    
                >
                <LinearGradient
                    colors={[primaryColor, secondaryColor]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.gradient]}
                >
                    <StyledText style={styles.buttonText}>{title}</StyledText>
                </LinearGradient>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    buttonContainer: {
        borderRadius: 16,
        justifyContent: 'center',
    },
    gradient: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 16,
        alignItems: 'flex-start',
        justifyContent: 'center',
        height: 110,
        flex: 1
    },
    buttonText: {
        color: '#fff',
        fontSize: 23,
        fontWeight: 'bold',
    },
});

export default GradientButton;