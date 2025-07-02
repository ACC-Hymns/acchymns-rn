import GradientButton from '@/components/GradientButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { BookSummary } from '@/constants/types';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { downloadHymnal, loadHymnals } from '@/scripts/hymnals';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { useContext, useRef, useState } from 'react';
import { Text, View, StyleSheet, Platform, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, FlatList, Alert } from 'react-native';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { usePostHog } from 'posthog-react-native';
import { translations } from '@/constants/localization';
import StyledText from '@/components/StyledText';

export default function HymnalImporter() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const isPresented = router.canGoBack();
    const context = useContext(HymnalContext);
    const posthog = usePostHog()

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    const desired_sort = [
        'ZH',
        'GH',
        'JH',
        'HZ',
        'CH',
        'HG',
        'ZG',
        'ZGE',
        'HSZ',
        'XC',
        'ZHG',
        'ZHH',
        'ZHJ',
        'ZHR',
        'ZHSP',
        'BS',
        'ES',
        'HS',
        'LDH',
        'MO',
        'PC'
    ]

    function sortHymnals(data: BookSummary[]) {
        data.sort((a, b) => {
            const aExists = context?.BOOK_DATA && Object.keys(context.BOOK_DATA).some(book => context.BOOK_DATA[book].name.short === a.name.short);
            const bExists = context?.BOOK_DATA && Object.keys(context.BOOK_DATA).some(book => context.BOOK_DATA[book].name.short === b.name.short);

            if (aExists && !bExists) return -1; // a exists, push to top
            if (!aExists && bExists) return 1; // b exists, push to top

            const aIndex = desired_sort.indexOf(a.name.short);
            const bIndex = desired_sort.indexOf(b.name.short);
            if (aIndex === -1 && bIndex === -1) return 0; // both not found, keep original order
            if (aIndex === -1) return 1; // a not found, move to end
            if (bIndex === -1) return -1; // b not found, move to end
            return aIndex - bIndex; // both found, sort by index
        });
    }

    // fetch github folder structure from api and return the data
    async function fetchHymnals() {
        const res = await fetch('https://api.acchymns.app/available_hymnals', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data: BookSummary[] = await res.json();
        // sort the data based on the desired_sort array
        sortHymnals(data);
        return data;
    }

    const { data, status, refetch } = useQuery({
        queryKey: ['hymnals'],
        queryFn: fetchHymnals,
    })

    if (status === 'pending') {
        return (
            <SafeAreaView style={styles.screenContainer}>
                <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <ActivityIndicator size="large" color={Colors[theme]['text']} />
                </View>
            </SafeAreaView>
        )
    }
    if (status === 'error') {
        return (
            <SafeAreaView style={styles.screenContainer}>

                <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <IconSymbol name="network.slash" size={64} color={Colors[theme]['fadedText']} />
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
            </SafeAreaView>
        )
    }

    return (
        <>
            <SafeAreaView style={styles.screenContainer}>
                {isPresented && (
                    <>

                        <FlatList
                            data={data.filter((item) => {
                                // check if the item is already in the context
                                const exists = context?.BOOK_DATA && Object.keys(context.BOOK_DATA).some(book => context.BOOK_DATA[book].name.short === item.name.short);
                                return !exists;
                            })}
                            keyExtractor={(item) => item.name.short}
                            contentContainerStyle={[styles.scrollView, { flexGrow: 1 }]}
                            ListHeaderComponent={(
                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    <StyledText style={styles.descriptionText}>{i18n.t('addHymnalSubtitle')}</StyledText>
                                </View>
                            )}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={async () => {
                                        // if already downloading don't do anything
                                        if ((context?.downloadProgressValues?.[item.name.short] ?? 0) === -1 || (context?.downloadProgressValues?.[item.name.short] ?? 0) > 0) return;


                                        context?.setDownloadProgressValues((prev) => ({ ...prev, [item.name.short]: -1 }));
                                        posthog.capture('hymnal_download_started', {
                                            hymnal_id: item.name.short,
                                        });
                                        await downloadHymnal(item.name.short, (progress) => {
                                            context?.setDownloadProgressValues((prev) => ({ ...prev, [item.name.short]: progress }));
                                        }, (success) => {
                                            if (!success) {
                                                posthog.capture('hymnal_download_failed', {
                                                    hymnal_id: item.name.short,
                                                });
                                                Alert.alert(i18n.t('verificationFailed'), i18n.t('verificationFailedMessage'), [
                                                    {
                                                        text: i18n.t('ignore'),
                                                        onPress: () => {

                                                        },
                                                        style: 'destructive'
                                                    },{
                                                        text: i18n.t('ok'),
                                                        onPress: () => {
                                                            // delete the files
                                                            context?.deleteHymnal?.(item.name.short);
                                                        },
                                                        style: 'default'
                                                    },
                                                    
                                                ]);
                                            }
                                            // reset the progress value
                                            context?.setDownloadProgressValues((prev) => ({ ...prev, [item.name.short]: 0 }));
                                        });

                                        // reload the data
                                        const data = await loadHymnals();

                                        if (!context) return;
                                        context?.SET_BOOK_DATA(data);

                                        refetch();
                                    }}
                                    style={styles.buttonContainer}
                                    activeOpacity={0.7} // Adjust this value to control the darkness
                                >
                                    <LinearGradient
                                        colors={[item.primaryColor, item.secondaryColor]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={[styles.gradient]}
                                    >
                                        <StyledText style={styles.buttonText}>{item.name.medium}</StyledText>
                                        {context?.downloadProgressValues[item.name.short] === -1 ? (
                                            <StyledText style={{ color: 'white', marginTop: 5 }}>{i18n.t('startingDownload')}</StyledText>
                                        ) : ((context?.downloadProgressValues[item.name.short] ?? 0) > 100) ? (
                                            <StyledText style={{ color: 'white', marginTop: 5 }}>{i18n.t('verifying')}</StyledText>
                                        ) : (context?.downloadProgressValues[item.name.short] ?? 0) > 0 ? (
                                            <StyledText style={{ color: 'white', marginTop: 5 }}>{`${i18n.t('progress')}: ${(context?.downloadProgressValues[item.name.short] ?? 0).toFixed(2)}%`}</StyledText>
                                        ) : (
                                            <StyledText style={{ color: 'white', marginTop: 5 }}>{`${i18n.t('size')}: ${((item.size ?? 0) / (1024 * 1024)).toFixed(2)} MB`}</StyledText>
                                        )}
                                        {(context?.downloadProgressValues[item.name.short] ?? 0) === 0 && (
                                            <View style={{ position: 'absolute', right: 20 }}>
                                                <IconSymbol name="plus.circle" size={32} weight='light' color="white" />
                                            </View>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        />
                    </>
                )}
            </SafeAreaView>
        </>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        fadedText: {
            fontSize: 24,
            fontWeight: '500',
            color: Colors[theme]['fadedText'], // Dynamically set text color using useThemeColor
            fontFamily: 'Lato'
        },
        descriptionText: {
            fontSize: 16,
            fontWeight: '400',
            color: Colors[theme]['fadedText'], // Dynamically set text color using useThemeColor
            fontFamily: 'Lato',
            textAlign: 'center'
        },
        buttonContainer: {
            borderRadius: 16,
            justifyContent: 'center',
            height: 110,
        },
        gradient: {
            paddingVertical: 15,
            marginBottom: 15,
            paddingHorizontal: 20,
            borderRadius: 16,
            alignItems: 'flex-start',
            justifyContent: 'center',
            height: 110,
            flex: 1
        },
        scrollView: {
            width: '100%',
            paddingTop: 15,
            paddingBottom: 15,
            paddingRight: 20,
            paddingLeft: 20,
        },
        button: {
            paddingVertical: 20,
            borderRadius: 16,
            marginBottom: 15,
            paddingHorizontal: 20,
            justifyContent: 'center',
            height: 110,
        },
        buttonText: {
            color: 'white',
            fontSize: 24,
            fontWeight: 'bold'
        },
        screenContainer: {
            flex: 1, // Ensures the container takes up the full screen
            backgroundColor: Colors[theme]['background'] // Dynamically set background color using useThemeColor
        },
        titleContainer: {
            marginLeft: 30,
            marginTop: 55
        },
        stepContainer: {
            gap: 8,
            marginBottom: 8
        },
        reactLogo: {
            height: 178,
            width: 290,
            bottom: 0,
            left: 0,
            position: 'absolute'
        },
        textStyle: {
            fontSize: 32,
            fontWeight: '500',
            color: Colors[theme]['text'] // Dynamically set text color using useThemeColor
        },
    });

};