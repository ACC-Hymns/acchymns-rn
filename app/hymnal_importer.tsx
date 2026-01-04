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
import { router, useFocusEffect } from 'expo-router';
import React, { useEffect, useCallback } from 'react';
import { useContext, useRef, useState } from 'react';
import { Text, View, StyleSheet, Platform, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, FlatList, Alert, AppState } from 'react-native';
import { usePostHog } from 'posthog-react-native';
import { useI18n } from '@/hooks/useI18n';
import StyledText from '@/components/StyledText';

export default function HymnalImporter() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);
    const isPresented = router.canGoBack();
    const context = useContext(HymnalContext);
    const posthog = usePostHog()

    const i18n = useI18n();

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
        console.log("data fetched: ");
        console.log(data);
    }

    // fetch github folder structure from api and return the data
    async function fetchHymnals() {
        try {
            // Add cache control headers for iOS
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const res = await fetch('https://api.acchymns.app/available_hymnals', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            console.log("WE GOT A RESPONSE", res.status);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data: BookSummary[] = await res.json();
            // sort the data based on the desired_sort array
            sortHymnals(data);
            return data;
        } catch (error: any) {
            console.error('Fetch error:', error);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    const [isReady, setIsReady] = useState(false);

    // iOS workaround: Wait for app to be fully active before making network requests
    useEffect(() => {
        if (Platform.OS === 'ios') {
            // Check if app is already active
            if (AppState.currentState === 'active') {
                // Small delay to ensure networking stack is ready
                const timer = setTimeout(() => {
                    setIsReady(true);
                }, 200);
                return () => clearTimeout(timer);
            } else {
                // Wait for app to become active
                const subscription = AppState.addEventListener('change', (nextAppState) => {
                    if (nextAppState === 'active') {
                        setTimeout(() => {
                            setIsReady(true);
                        }, 200);
                    }
                });
                return () => subscription.remove();
            }
        } else {
            setIsReady(true);
        }
    }, []);

    const { data, status, refetch, isFetching } = useQuery({
        queryKey: ['hymnals'],
        queryFn: fetchHymnals,
        enabled: isReady, // Only run when ready (iOS workaround)
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Ensure query runs when screen is focused
    useFocusEffect(
        useCallback(() => {
            if (isReady && status === 'pending' && !isFetching) {
                // Small delay to ensure iOS networking is ready
                const timer = setTimeout(() => {
                    refetch();
                }, 100);
                return () => clearTimeout(timer);
            }
        }, [isReady, status, isFetching, refetch])
    );

    if (status === 'pending') {
        return (
            <View style={styles.screenContainer}>
                <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <ActivityIndicator size="large" color={Colors[theme]['text']} />
                </View>
            </View>
        )
    }
    if (status === 'error') {
        return (
            <View style={styles.screenContainer}>

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
            </View>
        )
    }

    return (
        <>
            <View style={styles.screenContainer}>
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
            </View>
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
            fontFamily: 'Lato', 
            fontWeight: 700
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
            fontFamily: 'Lato', 
            fontWeight: 500,
            color: Colors[theme]['text'] // Dynamically set text color using useThemeColor
        },
    });

};