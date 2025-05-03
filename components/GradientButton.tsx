import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientButtonProps {
    title: string;
    onPress: () => void;
    primaryColor: string;
    secondaryColor: string;
}

const GradientButton: React.FC<GradientButtonProps> = ({
    title,
    onPress,
    primaryColor,
    secondaryColor,
}) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={styles.buttonContainer}
            activeOpacity={0.7} // Adjust this value to control the darkness
        >
            <LinearGradient
                colors={[primaryColor, secondaryColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradient]}
            >
                <Text style={styles.buttonText}>{title}</Text>
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
        paddingVertical: 15,
        marginBottom: 15,
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