import React, { useContext } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';
import type { ComponentProps } from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';

import {
    EcampSingingBannerCard,
    EcampSingingBannerStaticViewButton,
} from '@/components/EcampSingingBannerCard';
import { FeatureIntroSlide } from '@/components/feature-intro/FeatureIntroSlide';
import StyledText from '@/components/StyledText';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useI18n } from '@/hooks/useI18n';

type FeatureIntroCampSlideProps = {
    icon: ComponentProps<typeof Ionicons>['name'];
    gradient: readonly [string, string];
    title: string;
    body: string;
};

export function FeatureIntroCampSlide({
    icon,
    gradient,
    title,
    body,
}: FeatureIntroCampSlideProps) {
    const theme = useColorScheme() ?? 'light';
    const i18n = useI18n();
    const context = useContext(HymnalContext);
    const bannerEnabled = context?.recommendedHymnBannerEnabled ?? true;

    return (
        <FeatureIntroSlide icon={icon} gradient={gradient} title={title} body={body}>
            <View style={styles.mockSection}>
                <EcampSingingBannerCard
                    songNumber={142}
                    hymnalLabel="Zion's Harp"
                    viewButton={<EcampSingingBannerStaticViewButton />}
                />

                <View style={[styles.toggleRow, { backgroundColor: Colors[theme].settingsButton }]}>
                    <StyledText style={[styles.toggleLabel, { color: Colors[theme].text }]}>
                        {i18n.t('recommendedHymnBanner')}
                    </StyledText>
                    <Switch
                        trackColor={{ true: Platform.OS === 'ios' ? Colors[theme].primary : Colors[theme].primaryFaded }}
                        thumbColor={Platform.OS === 'ios' ? 'white' : bannerEnabled ? Colors[theme].primary : Colors[theme].fadedIcon}
                        value={bannerEnabled}
                        onValueChange={(value) => {
                            context?.setRecommendedHymnBannerEnabled(value);
                        }}
                    />
                </View>
            </View>
        </FeatureIntroSlide>
    );
}

const styles = StyleSheet.create({
    mockSection: {
        width: '100%',
        maxWidth: 340,
        gap: 12,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    toggleLabel: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'LatoRegular',
        marginRight: 12,
    },
});
