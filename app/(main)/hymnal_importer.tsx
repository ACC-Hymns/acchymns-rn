import HymnalPackageRow from '@/components/HymnalPackageRow';
import StyledText from '@/components/StyledText';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { BookSummary } from '@/constants/types';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
    getAvailableHymnals,
    sortHymnalsByPreferredOrder,
    useHymnalUpdates,
} from '@/hooks/useHymnalUpdates';
import { useI18n } from '@/hooks/useI18n';
import { RemoteHymnalPackage } from '@/scripts/hymnalUpdates';
import Ionicons from '@react-native-vector-icons/ionicons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    AppState,
    Platform,
    SectionList,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

type HymnalSection = {
    title: string;
    mode: 'update' | 'download';
    data: RemoteHymnalPackage[];
};

export default function HymnalImporter() {
    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);
    const isPresented = router.canGoBack();
    const context = useContext(HymnalContext);
    const i18n = useI18n();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (Platform.OS === 'ios') {
            if (AppState.currentState === 'active') {
                const timer = setTimeout(() => setIsReady(true), 200);
                return () => clearTimeout(timer);
            }

            const subscription = AppState.addEventListener('change', (nextAppState) => {
                if (nextAppState === 'active') {
                    setTimeout(() => setIsReady(true), 200);
                }
            });
            return () => subscription.remove();
        }

        setIsReady(true);
    }, []);

    const { data, isPending, isError, refetch } = useHymnalUpdates(isReady);

    useFocusEffect(
        useCallback(() => {
            if (isReady && isPending && !data) {
                const timer = setTimeout(() => {
                    refetch();
                }, 100);
                return () => clearTimeout(timer);
            }
        }, [data, isReady, isPending, refetch]),
    );

    const bookSummaryMap = useMemo(() => {
        const map = new Map<string, BookSummary>();
        data?.bookSummaries.forEach((book) => {
            map.set(book.name.short, book);
        });
        return map;
    }, [data?.bookSummaries]);

    const sections = useMemo<HymnalSection[]>(() => {
        if (!data || !context?.BOOK_DATA) {
            return [];
        }

        const dismissed = context.dismissedHymnalPackages;
        const outdated = sortHymnalsByPreferredOrder(
            data.outdatedHymnals.filter((hymnal) => !dismissed[hymnal.id]),
        );
        const available = sortHymnalsByPreferredOrder(
            getAvailableHymnals(data.remoteHymnals, context.BOOK_DATA)
                .filter((hymnal) => !dismissed[hymnal.id]),
        );

        const nextSections: HymnalSection[] = [];
        if (outdated.length > 0) {
            nextSections.push({
                title: i18n.t('updatesAvailable'),
                mode: 'update',
                data: outdated,
            });
        }
        if (available.length > 0) {
            nextSections.push({
                title: outdated.length > 0 ? i18n.t('availableHymnals') : '',
                mode: 'download',
                data: available,
            });
        }

        return nextSections;
    }, [context?.BOOK_DATA, context?.dismissedHymnalPackages, data, i18n]);

    useEffect(() => {
        if (!data?.outdatedHymnals.length || !context?.clearDismissedHymnalPackage) {
            return;
        }

        for (const hymnal of data.outdatedHymnals) {
            if (context.dismissedHymnalPackages?.[hymnal.id]) {
                context.clearDismissedHymnalPackage(hymnal.id);
            }
        }
    }, [
        context?.clearDismissedHymnalPackage,
        context?.dismissedHymnalPackages,
        data?.outdatedHymnals,
    ]);

    if (isPending && !data) {
        return (
            <View style={styles.screenContainer}>
                <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <ActivityIndicator size="large" color={Colors[theme]['text']} />
                </View>
            </View>
        );
    }

    if (isError && !data) {
        return (
            <View style={styles.screenContainer}>
                <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <Ionicons name="cloud-offline-outline" size={64} color={Colors[theme]['fadedText']} />
                    <StyledText style={{ color: Colors[theme]['fadedText'], fontSize: 18, marginTop: 16, fontWeight: '500' }}>
                        {i18n.t('failedToLoadHymnals')}
                    </StyledText>
                    <StyledText style={{ color: Colors[theme]['fadedText'], fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                        {i18n.t('failedToLoadHymnalsMessage')}
                    </StyledText>
                    <TouchableOpacity
                        onPress={() => refetch()}
                        style={{
                            marginTop: 20,
                            paddingVertical: 10,
                            paddingHorizontal: 20,
                            backgroundColor: Colors[theme]['primary'],
                            borderRadius: 8,
                        }}
                    >
                        <StyledText style={{ color: 'white', fontSize: 16, fontWeight: '500' }}>{i18n.t('retry')}</StyledText>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.screenContainer}>
            {isPresented && (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.scrollView, { flexGrow: 1 }]}
                    stickySectionHeadersEnabled={false}
                    ListHeaderComponent={(
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <StyledText style={styles.descriptionText}>
                                {sections.length === 0
                                    ? i18n.t('allHymnalsUpToDate')
                                    : i18n.t('addHymnalSubtitle')}
                            </StyledText>
                        </View>
                    )}
                    ListEmptyComponent={(
                        <View style={{ alignItems: 'center', paddingTop: 40 }}>
                            <Ionicons name="checkmark-circle-outline" size={56} color={Colors[theme]['fadedText']} />
                            <StyledText style={[styles.descriptionText, { marginTop: 16 }]}>
                                {i18n.t('allHymnalsUpToDate')}
                            </StyledText>
                        </View>
                    )}
                    renderSectionHeader={({ section: { title } }) => (
                        title ? (
                            <StyledText style={styles.sectionTitle}>{title}</StyledText>
                        ) : null
                    )}
                    renderItem={({ item, section }) => (
                        <HymnalPackageRow
                            item={item}
                            bookSummary={bookSummaryMap.get(item.id) || context?.BOOK_DATA?.[item.id]}
                            mode={section.mode}
                        />
                    )}
                />
            )}
        </View>
    );
}

function makeStyles(theme: 'light' | 'dark') {
    return StyleSheet.create({
        descriptionText: {
            fontSize: 16,
            fontWeight: '400',
            color: Colors[theme]['fadedText'],
            fontFamily: 'Lato',
            textAlign: 'center',
        },
        sectionTitle: {
            fontSize: 14,
            color: Colors[theme]['fadedText'],
            fontFamily: 'Lato',
            marginBottom: 12,
            marginTop: 4,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        scrollView: {
            width: '100%',
            paddingTop: 15,
            paddingBottom: 15,
            paddingRight: 20,
            paddingLeft: 20,
        },
        screenContainer: {
            flex: 1,
            backgroundColor: Colors[theme]['background'],
        },
    });
}
