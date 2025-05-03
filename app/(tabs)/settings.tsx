import { Image, StyleSheet, Platform } from 'react-native';

export default function SettingsScreen() {
    return (
        <>
            
        </>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stepContainer: {
        gap: 8,
        marginBottom: 8,
    },
    reactLogo: {
        height: 178,
        width: 290,
        bottom: 0,
        left: 0,
        position: 'absolute',
    },
    textStyle: {
        fontSize: 32,
        fontWeight: '500',
        lineHeight: 24,
        marginBottom: 8,
        textAlign: 'center',
        color: '#000',
        paddingHorizontal: 16,
        ...(Platform.OS === 'web' && {
            fontFamily: 'Inter',
        }),
    },
});
