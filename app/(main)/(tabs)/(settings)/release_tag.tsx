import StyledText from '@/components/StyledText';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { isIOS26DesignDisabled } from '@/constants/iosDesign';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useI18n } from '@/hooks/useI18n';
import { fetchHymnalReleaseTags } from '@/scripts/hymnalUpdates';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useNavigation } from 'expo-router';
import React, { useContext, useLayoutEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableHighlight,
    View,
} from 'react-native';
import { Divider } from 'react-native-elements';

const GITHUB_LATEST_RELEASE = '__github_latest__';

export default function ReleaseTagScreen() {
    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const context = useContext(HymnalContext);
    const i18n = useI18n();
    const navigation = useNavigation();
    const queryClient = useQueryClient();

    const [selectedTag, setSelectedTag] = useState(
        context?.hymnalReleaseTag?.trim() || GITHUB_LATEST_RELEASE,
    );
    const [customTag, setCustomTag] = useState(context?.hymnalReleaseTag?.trim() || '');

    useLayoutEffect(() => {
        navigation.setOptions({
            title: i18n.t('hymnalReleaseTag'),
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

    const { data: releases, status } = useQuery({
        queryKey: ['hymnal-release-tags'],
        queryFn: () => fetchHymnalReleaseTags(25),
        staleTime: 5 * 60 * 1000,
    });

    const releaseOptions = useMemo(() => {
        const tags = new Set<string>([GITHUB_LATEST_RELEASE]);
        releases?.forEach((release) => tags.add(release.tag_name));
        if (customTag.trim()) {
            tags.add(customTag.trim());
        }

        return Array.from(tags).sort((a, b) => {
            if (a === GITHUB_LATEST_RELEASE) {
                return -1;
            }
            if (b === GITHUB_LATEST_RELEASE) {
                return 1;
            }

            const aNum = Number(a);
            const bNum = Number(b);
            if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
                return bNum - aNum;
            }

            return b.localeCompare(a);
        });
    }, [customTag, releases]);

    const applyTag = (tag: string) => {
        const normalizedTag = tag.trim();
        const storedTag = normalizedTag === GITHUB_LATEST_RELEASE ? null : normalizedTag;
        setSelectedTag(normalizedTag === GITHUB_LATEST_RELEASE ? GITHUB_LATEST_RELEASE : normalizedTag);
        context?.setHymnalReleaseTag(storedTag);
        context?.clearAllDismissedHymnalPackages?.();
        queryClient.invalidateQueries({ queryKey: ['hymnal-updates'] });
    };

    const labelForTag = (tag: string) => {
        if (tag === GITHUB_LATEST_RELEASE) {
            return i18n.t('hymnalReleaseTagLatest');
        }

        const release = releases?.find((item) => item.tag_name === tag);
        if (!release) {
            return tag;
        }

        return release.prerelease ? `${tag} (${i18n.t('prerelease')})` : tag;
    };

    return (
        <View style={{ flex: 1, backgroundColor: Colors[theme].background }}>
            <ScrollView style={styles.scrollView}>
                <StyledText style={styles.descriptionText}>{i18n.t('hymnalReleaseTagDescription')}</StyledText>

                <View style={{ marginTop: 16 }}>
                    <StyledText style={styles.settingsLabel}>{i18n.t('customReleaseTag').toUpperCase()}</StyledText>
                </View>
                <View style={[styles.settingsContainer, styles.customTagContainer]}>
                    <TextInput
                        value={customTag}
                        onChangeText={setCustomTag}
                        placeholder={i18n.t('customReleaseTagPlaceholder')}
                        placeholderTextColor={Colors[theme].fadedText}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.customTagInput, { color: Colors[theme].text }]}
                    />
                    <TouchableHighlight
                        onPress={() => {
                            if (!customTag.trim()) {
                                return;
                            }
                            applyTag(customTag.trim());
                        }}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.applyButton}>
                            <StyledText style={styles.applyButtonText}>{i18n.t('apply')}</StyledText>
                        </View>
                    </TouchableHighlight>
                </View>

                <View style={{ marginTop: 24 }}>
                    <StyledText style={styles.settingsLabel}>{i18n.t('hymnalReleaseTag').toUpperCase()}</StyledText>
                </View>
                <View style={styles.settingsContainer}>
                    {status === 'pending' && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color={Colors[theme].text} />
                        </View>
                    )}
                    {status === 'error' && (
                        <View style={styles.loadingContainer}>
                            <StyledText style={{ color: Colors[theme].fadedText }}>
                                {i18n.t('failedToLoadReleaseTags')}
                            </StyledText>
                        </View>
                    )}
                    {status === 'success' && releaseOptions.map((tag, index) => (
                        <React.Fragment key={tag}>
                            <TouchableHighlight
                                onPress={() => applyTag(tag)}
                                underlayColor={Colors[theme].divider}
                            >
                                <View style={styles.settingsItem}>
                                    <View style={{ flex: 1, paddingRight: 12 }}>
                                        <StyledText style={styles.settingsText}>{labelForTag(tag)}</StyledText>
                                        {tag !== GITHUB_LATEST_RELEASE && (
                                            <StyledText style={styles.tagSubtitle}>{tag}</StyledText>
                                        )}
                                    </View>
                                    {selectedTag === tag && (
                                        <Ionicons name="checkmark" size={18} color={Colors[theme].primary} />
                                    )}
                                </View>
                            </TouchableHighlight>
                            {index < releaseOptions.length - 1 && (
                                <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                            )}
                        </React.Fragment>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

function makeStyles(theme: 'light' | 'dark') {
    return StyleSheet.create({
        scrollView: {
            flex: 1,
            width: '100%',
            paddingTop: 125,
            paddingBottom: 15,
            paddingRight: 20,
            paddingLeft: 20,
        },
        descriptionText: {
            fontSize: 15,
            color: Colors[theme].fadedText,
            fontFamily: 'Lato',
            textAlign: 'center',
        },
        settingsLabel: {
            fontSize: 14,
            fontWeight: '400',
            color: Colors[theme].fadedText,
            fontFamily: 'Lato',
            marginLeft: '5%',
            marginVertical: 8,
        },
        settingsContainer: {
            backgroundColor: Colors[theme].settingsButton,
            borderRadius: 12,
            overflow: 'hidden',
        },
        settingsItem: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: '5%',
            paddingVertical: 14,
        },
        settingsText: {
            fontSize: 18,
            fontWeight: '400',
            color: Colors[theme].text,
            fontFamily: 'Lato',
        },
        tagSubtitle: {
            fontSize: 13,
            color: Colors[theme].fadedText,
            fontFamily: 'Lato',
            marginTop: 4,
        },
        customTagContainer: {
            padding: 12,
            gap: 12,
        },
        customTagInput: {
            borderWidth: 1,
            borderColor: Colors[theme].divider,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontFamily: 'Lato',
            fontSize: 16,
        },
        applyButton: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: Colors[theme].primary,
        },
        applyButtonText: {
            color: 'white',
            fontFamily: 'Lato',
            fontSize: 16,
            fontWeight: '600',
        },
        loadingContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 24,
        },
    });
}
