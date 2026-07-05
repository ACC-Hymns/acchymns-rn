import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import type { ComponentProps } from 'react';

import StyledText from '@/components/StyledText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

type FeatureIntroSlideProps = {
    icon: ComponentProps<typeof Ionicons>['name'];
    gradient: readonly [string, string];
    title: string;
    body: string;
    children?: React.ReactNode;
};

export function FeatureIntroSlide({
    icon,
    gradient,
    title,
    body,
    children,
}: FeatureIntroSlideProps) {
    const theme = useColorScheme() ?? 'light';

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[...gradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconHalo}
            >
                <View style={[styles.iconInner, { backgroundColor: Colors[theme].songBackground }]}>
                    <Ionicons name={icon} size={48} color={gradient[0]} />
                </View>
            </LinearGradient>

            <StyledText style={[styles.title, { color: Colors[theme].text }]}>{title}</StyledText>
            <StyledText style={[styles.body, { color: Colors[theme].fadedText }]}>{body}</StyledText>

            {children ? <View style={styles.childrenContainer}>{children}</View> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingBottom: 24,
    },
    iconHalo: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
    },
    iconInner: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 26,
        fontFamily: 'LatoBold',
        textAlign: 'center',
        marginBottom: 12,
    },
    body: {
        fontSize: 16,
        fontFamily: 'LatoRegular',
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 320,
    },
    childrenContainer: {
        marginTop: 32,
        width: '100%',
        alignItems: 'center',
    },
});
