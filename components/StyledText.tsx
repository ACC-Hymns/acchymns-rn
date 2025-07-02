import { fontFamily } from '@/constants/assets';
import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

type StyledTextProps = TextProps & {
    children: React.ReactNode;
    font_family?: string;
};

const DEFAULT_FONT_FAMILY = fontFamily.regular; // Replace with your custom font if needed

export default function StyledText({
    children,
    style,
    font_family = DEFAULT_FONT_FAMILY,
    ...props
}: StyledTextProps) {
    return (
        <Text
            style={[styles.text, { fontFamily: font_family }, style]}
            {...props}
        >
            {children}
        </Text>
    );
}

const styles = StyleSheet.create({
    text: {
        
    },
});