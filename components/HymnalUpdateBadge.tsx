import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useHymnalUpdates } from '@/hooks/useHymnalUpdates';
import { StyleSheet, View } from 'react-native';
import StyledText from './StyledText';

type HymnalUpdateBadgeProps = {
    size?: 'small' | 'medium';
};

export default function HymnalUpdateBadge({ size = 'small' }: HymnalUpdateBadgeProps) {
    const theme = useColorScheme() ?? 'light';
    const { data } = useHymnalUpdates();
    const count = data?.outdatedHymnals.length ?? 0;

    if (count === 0) {
        return null;
    }

    const isSmall = size === 'small';

    return (
        <View
            style={[
                styles.badge,
                isSmall ? styles.badgeSmall : styles.badgeMedium,
                { backgroundColor: Colors[theme].primary },
            ]}
        >
            <StyledText style={[styles.badgeText, isSmall ? styles.badgeTextSmall : styles.badgeTextMedium]}>
                {count > 9 ? '9+' : count}
            </StyledText>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeSmall: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        paddingHorizontal: 6,
    },
    badgeMedium: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        paddingHorizontal: 7,
    },
    badgeText: {
        color: 'white',
        fontFamily: 'Lato',
        fontWeight: '700',
    },
    badgeTextSmall: {
        fontSize: 11,
    },
    badgeTextMedium: {
        fontSize: 12,
    },
});
