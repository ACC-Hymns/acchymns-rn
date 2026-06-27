import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import StyledText from '@/components/StyledText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useEcampDisplayState } from '@/hooks/useEcampDisplayState';
import { useI18n } from '@/hooks/useI18n';
import { formatEcampSingingLabel } from '@/scripts/ecampDisplay';

export default function EcampSingingBanner() {
    const theme = useColorScheme() ?? 'light';
    const i18n = useI18n();
    const insets = useSafeAreaInsets();
    const { display, title, hidden } = useEcampDisplayState();

    const message = useMemo(() => {
        if (!display) {
            return null;
        }

        const label = formatEcampSingingLabel(display, title);
        return i18n.t('currentlySinging', { label });
    }, [display, i18n, title]);

    if (hidden || !message) {
        return null;
    }

    return (
        <View
            pointerEvents="box-none"
            style={[
                styles.container,
                {
                    paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 8 : 0) + 8,
                    backgroundColor: Colors[theme].primary,
                },
            ]}
        >
            <StyledText style={styles.text}>{message}</StyledText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    text: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'LatoBold',
        textAlign: 'center',
    },
});
