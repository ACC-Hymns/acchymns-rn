import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientButtonProps {
    title: string;
    onPress: () => void;
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
        <TouchableOpacity
            onPressIn={() => {
                // check press duration
                setPressStart(Date.now());
            }}
            onPressOut={() => {
                const pressEnd = Date.now();
                if (pressStart) {
                    const duration = pressEnd - pressStart; // Calculate the duration of the press
                    if(duration < 300) {
                        onPress(); // Call the onPress function if the duration is less than 200ms
                    } else {
                        onLongPress && onLongPress(); // Call the onLongPress function if the duration is more than 200ms
                    }
                    setPressStart(null); // Reset the press start time
                }
            }}
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