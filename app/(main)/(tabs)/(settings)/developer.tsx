import StyledText from '@/components/StyledText';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { APP_FEATURE_FLAGS } from '@/constants/featureFlags';
import { isDeveloperSettingsEnabled } from '@/constants/build';
import { isIOS26DesignDisabled } from '@/constants/iosDesign';
import { useAppFeatureFlag, isFeatureFlagEnabled } from '@/hooks/useAppFeatureFlag';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useI18n } from '@/hooks/useI18n';
import { useRouterPushOnce } from '@/hooks/useRouterPushOnce';
import { formatHymnalReleaseTagPreference } from '@/scripts/hymnalUpdates';
import { router, useNavigation } from 'expo-router';
import { useFeatureFlag } from 'posthog-react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import React, { useContext, useEffect, useLayoutEffect } from 'react';
import {
    ScrollView,
    StyleSheet,
    TouchableHighlight,
    View,
} from 'react-native';
import { Divider } from 'react-native-elements';

type OverrideMode = 'default' | 'on' | 'off';

function FeatureFlagRow({
    flagKey,
    label,
    theme,
    styles,
    override,
    onSelect,
}: {
    flagKey: string;
    label: string;
    theme: 'light' | 'dark';
    styles: ReturnType<typeof makeStyles>;
    override: boolean | undefined;
    onSelect: (mode: OverrideMode) => void;
}) {
    const i18n = useI18n();
    const remoteValue = useFeatureFlag(flagKey);
    const effectiveValue = useAppFeatureFlag(flagKey);
    const selectedMode: OverrideMode =
        override === undefined ? 'default' : override ? 'on' : 'off';

    const formatValue = (value: boolean | string | undefined) => {
        if (value === undefined) {
            return i18n.t('featureFlagUnknown');
        }
        return isFeatureFlagEnabled(value) ? i18n.t('featureFlagOn') : i18n.t('featureFlagOff');
    };

    return (
        <View style={styles.flagBlock}>
            <View style={styles.flagHeader}>
                <StyledText style={styles.settingsText}>{label}</StyledText>
                <StyledText style={styles.flagMeta}>
                    {i18n.t('featureFlagRemote')}: {formatValue(remoteValue)}
                </StyledText>
                <StyledText style={styles.flagMeta}>
                    {i18n.t('featureFlagEffective')}: {formatValue(effectiveValue)}
                </StyledText>
            </View>
            <View style={styles.segmentRow}>
                {(['default', 'on', 'off'] as const).map((mode) => {
                    const isSelected = selectedMode === mode;
                    const labelKey =
                        mode === 'default'
                            ? 'featureFlagUseRemote'
                            : mode === 'on'
                              ? 'featureFlagForcedOn'
                              : 'featureFlagForcedOff';

                    return (
                        <TouchableHighlight
                            key={mode}
                            underlayColor={Colors[theme].divider}
                            onPress={() => onSelect(mode)}
                            style={[
                                styles.segmentButton,
                                isSelected && styles.segmentButtonSelected,
                            ]}
                        >
                            <StyledText
                                style={[
                                    styles.segmentButtonText,
                                    isSelected && styles.segmentButtonTextSelected,
                                ]}
                            >
                                {i18n.t(labelKey)}
                            </StyledText>
                        </TouchableHighlight>
                    );
                })}
            </View>
        </View>
    );
}

export default function DeveloperSettingsScreen() {
    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const context = useContext(HymnalContext);
    const i18n = useI18n();
    const navigation = useNavigation();
    const push = useRouterPushOnce();
    const showDeveloperSettings = isDeveloperSettingsEnabled(context?.developerMode);

    useEffect(() => {
        if (!showDeveloperSettings) {
            router.replace('/(main)/(tabs)/(settings)');
        }
    }, [showDeveloperSettings]);

    useLayoutEffect(() => {
        navigation.setOptions({
            title: i18n.t('developerSettings'),
        });
    }, [navigation, i18n]);

    useLayoutEffect(() => {
        if (!isIOS26DesignDisabled()) {
            return;
        }

        navigation.setOptions({
            unstable_headerLeftItems: () => [
                {
                    type: 'button',
                    label: 'Back',
                    icon: {
                        type: 'sfSymbol',
                        name: 'chevron.left',
                    },
                    tintColor: Colors[theme].icon,
                    onPress: () => {
                        router.back();
                    },
                },
            ],
        });
    }, [navigation, theme]);

    const handleSelectOverride = (flagKey: string, mode: OverrideMode) => {
        if (mode === 'default') {
            context?.setFeatureFlagOverride(flagKey, null);
            return;
        }

        context?.setFeatureFlagOverride(flagKey, mode === 'on');
    };

    return (
        <View style={{ flex: 1, backgroundColor: Colors[theme].background }}>
            <ScrollView style={styles.scrollView}>
                <StyledText style={styles.settingsLabel}>{i18n.t('hymnals')}</StyledText>
                <View style={styles.settingsContainer}>
                    <TouchableHighlight
                        onPress={() => push('/(main)/(tabs)/(settings)/release_tag')}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <StyledText style={styles.settingsText}>{i18n.t('hymnalReleaseTag')}</StyledText>
                            <View style={styles.settingsValueRow}>
                                <StyledText style={[styles.settingsText, styles.settingsValueText]}>
                                    {formatHymnalReleaseTagPreference(
                                        context?.hymnalReleaseTag,
                                        i18n.t('hymnalReleaseTagLatest'),
                                    )}
                                </StyledText>
                                <Ionicons name="chevron-forward-outline" size={14} color={Colors[theme].fadedIcon} />
                            </View>
                        </View>
                    </TouchableHighlight>
                </View>
                <StyledText style={[styles.settingsLabel, { marginTop: 24 }]}>{i18n.t('featureFlags')}</StyledText>
                <View style={styles.settingsContainer}>
                    {APP_FEATURE_FLAGS.map((flag, index) => (
                        <React.Fragment key={flag.key}>
                            {index > 0 && (
                                <Divider
                                    width={1}
                                    color={Colors[theme].divider}
                                    style={{ width: '95%', marginLeft: 'auto' }}
                                />
                            )}
                            <FeatureFlagRow
                                flagKey={flag.key}
                                label={flag.label}
                                theme={theme}
                                styles={styles}
                                override={context?.featureFlagOverrides?.[flag.key]}
                                onSelect={(mode) => handleSelectOverride(flag.key, mode)}
                            />
                        </React.Fragment>
                    ))}
                </View>
                <TouchableHighlight
                    underlayColor={Colors[theme].divider}
                    onPress={() => context?.clearFeatureFlagOverrides()}
                    style={styles.resetButton}
                >
                    <StyledText style={styles.resetButtonText}>{i18n.t('resetFeatureFlagOverrides')}</StyledText>
                </TouchableHighlight>
            </ScrollView>
        </View>
    );
}

function makeStyles(theme: 'light' | 'dark') {
    return StyleSheet.create({
        scrollView: {
            flex: 1,
            width: '100%',
            paddingTop: 140,
            paddingBottom: 15,
            paddingRight: 20,
            paddingLeft: 20,
        },
        settingsLabel: {
            fontSize: 14,
            fontWeight: '400',
            color: Colors[theme].fadedText,
            fontFamily: 'Lato',
            marginLeft: 20,
            marginVertical: 8,
        },
        settingsContainer: {
            backgroundColor: Colors[theme].settingsButton,
            borderRadius: 12,
            overflow: 'hidden',
        },
        settingsText: {
            fontSize: 18,
            fontWeight: '400',
            color: Colors[theme].text,
            fontFamily: 'Lato',
        },
        settingsItem: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 14,
        },
        settingsValueRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        settingsValueText: {
            color: Colors[theme].fadedText,
        },
        flagBlock: {
            paddingHorizontal: 20,
            paddingVertical: 14,
            gap: 10,
        },
        flagHeader: {
            gap: 4,
        },
        flagMeta: {
            fontSize: 14,
            color: Colors[theme].fadedText,
            fontFamily: 'Lato',
        },
        segmentRow: {
            flexDirection: 'row',
            gap: 8,
        },
        segmentButton: {
            flex: 1,
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 6,
            backgroundColor: Colors[theme].background,
            alignItems: 'center',
        },
        segmentButtonSelected: {
            backgroundColor: Colors[theme].primary,
        },
        segmentButtonText: {
            fontSize: 13,
            color: Colors[theme].text,
            fontFamily: 'Lato',
            textAlign: 'center',
        },
        segmentButtonTextSelected: {
            color: 'white',
            fontWeight: '600',
        },
        resetButton: {
            marginTop: 24,
            borderRadius: 12,
            backgroundColor: Colors[theme].settingsButton,
            paddingVertical: 14,
            alignItems: 'center',
        },
        resetButtonText: {
            fontSize: 18,
            color: Colors[theme].text,
            fontFamily: 'Lato',
        },
    });
}
