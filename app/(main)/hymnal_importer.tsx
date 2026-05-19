import GradientButton from '@/components/GradientButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { BookSummary } from '@/constants/types';
import { useColorScheme } from '@/hooks/useColorScheme';
import { downloadHymnal, loadHymnals } from '@/scripts/hymnals';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useEffect, useCallback } from 'react';
import { useContext, useRef, useState } from 'react';
import { Text, View, StyleSheet, Platform, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, FlatList, Alert, AppState, Animated, Dimensions } from 'react-native';
import { usePostHog } from 'posthog-react-native';
import { useI18n } from '@/hooks/useI18n';
import StyledText from '@/components/StyledText';

// GitHub Release API types
type GitHubUser = {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    user_view_type: string;
    site_admin: boolean;
};

type GitHubReleaseAsset = {
    url: string;
    id: number;
    node_id: string;
    name: string;
    label: string;
    uploader: GitHubUser;
    content_type: string;
    state: string;
    size: number;
    digest: string;
    download_count: number;
    created_at: string;
    updated_at: string;
    browser_download_url: string;
};

type GitHubRelease = {
    url: string;
    assets_url: string;
    upload_url: string;
    html_url: string;
    id: number;
    author: GitHubUser;
    node_id: string;
    tag_name: string;
    target_commitish: string;
    name: string;
    draft: boolean;
    immutable: boolean;
    prerelease: boolean;
    created_at: string;
    updated_at: string;
    published_at: string;
    assets: GitHubReleaseAsset[];
    tarball_url: string;
    zipball_url: string;
    body: string;
};

// Bottom progress line component
const ProgressLine = ({ progress, isIntermediate }: { progress: number; isIntermediate: boolean }) => {
    const animatedWidth = React.useRef(new Animated.Value(0)).current;
    const slideAnimation = React.useRef(new Animated.Value(0)).current;
    const [containerWidth, setContainerWidth] = React.useState(Dimensions.get('window').width);
    const segmentWidth = 100;

    React.useEffect(() => {
        // Animate progress width smoothly
        const targetProgress = Math.min(Math.max(progress, 0), 100);
        Animated.spring(animatedWidth, {
            toValue: targetProgress,
            tension: 50,
            friction: 7,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    React.useEffect(() => {
        if (isIntermediate) {
            // Reset animation value to ensure it starts from the beginning
            slideAnimation.setValue(0);
            // Continuous sliding line segment animation
            const slide = Animated.loop(
                Animated.sequence([
                    Animated.timing(slideAnimation, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnimation, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            );
            slide.start();
            return () => slide.stop();
        } else {
            slideAnimation.setValue(0);
        }
    }, [isIntermediate]);

    const widthInterpolate = animatedWidth.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    // Calculate slide distance based on container width to ensure it goes all the way across
    const slideTranslateX = slideAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [-segmentWidth, containerWidth + segmentWidth],
    });

    return (
        <View
            onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                if (width > 0) {
                    setContainerWidth(width);
                }
            }}
            style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 5,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 2.5,
                overflow: 'hidden',
            }}
        >
            {!isIntermediate && (
                <Animated.View
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        height: '100%',
                        width: widthInterpolate,
                        backgroundColor: 'white',
                        borderRadius: 2.5,
                    }}
                />
            )}
            {isIntermediate && (
                <View
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '100%',
                        overflow: 'hidden',
                    }}
                >
                    <Animated.View
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            width: segmentWidth,
                            height: '100%',
                            backgroundColor: 'white',
                            borderRadius: 2.5,
                            transform: [{ translateX: slideTranslateX }],
                        }}
                    />
                </View>
            )}
        </View>
    );
};

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

    // Extract hymnal IDs from release assets and merge with BookSummary data
    function getHymnalsFromRelease(
        release: GitHubRelease | undefined,
        bookSummaries: BookSummary[]
    ): Array<{ 
        id: string; 
        size: number; 
        downloadUrl: string; 
        sha256: string;
        bookSummary?: BookSummary;
    }> {
        if (!release) return [];
        
        // Create a map of BookSummary by short name for quick lookup
        const bookSummaryMap = new Map<string, BookSummary>();
        bookSummaries.forEach(book => {
            bookSummaryMap.set(book.name.short, book);
        });
        
        const hymnals = release.assets
            .filter(asset => asset.name.endsWith('.zip'))
            .map(asset => {
                const id = asset.name.replace('.zip', '');
                const bookSummary = bookSummaryMap.get(id);
                return {
                    id,
                    size: asset.size,
                    downloadUrl: asset.browser_download_url,
                    sha256: asset.digest,
                    bookSummary
                };
            })
            .sort((a, b) => {
                const aExists = context?.BOOK_DATA && Object.keys(context.BOOK_DATA).some(book => context.BOOK_DATA[book].name.short === a.id);
                const bExists = context?.BOOK_DATA && Object.keys(context.BOOK_DATA).some(book => context.BOOK_DATA[book].name.short === b.id);

                if (aExists && !bExists) return -1;
                if (!aExists && bExists) return 1;

                const aIndex = desired_sort.indexOf(a.id);
                const bIndex = desired_sort.indexOf(b.id);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        
        return hymnals;
    }

    // Combined type for the merged data
    type HymnalData = {
        release: GitHubRelease;
        bookSummaries: BookSummary[];
    };

    // fetch both endpoints and merge the data
    async function fetchHymnals(): Promise<HymnalData> {
        try {
            // Add cache control headers for iOS
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            // Call both endpoints in parallel
            const [releaseRes, summariesRes] = await Promise.all([
                fetch('https://api.github.com/repos/ACC-Hymns/books/releases/latest', {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                    },
                    signal: controller.signal,
                }),
                fetch('https://api.acchymns.app/available_hymnals', {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                    },
                    signal: controller.signal,
                }).catch(() => null) // Fallback gracefully if old endpoint doesn't exist
            ]);

            clearTimeout(timeoutId);

            if (!releaseRes.ok) {
                throw new Error(`Release API error! status: ${releaseRes.status}`);
            }

            const release: GitHubRelease = await releaseRes.json();
            
            // Try to get BookSummary data from old endpoint
            let bookSummaries: BookSummary[] = [];
            if (summariesRes && summariesRes.ok) {
                try {
                    bookSummaries = await summariesRes.json();
                } catch (e) {
                    console.warn('Failed to parse book summaries from old endpoint:', e);
                }
            } else {
                console.warn('Old endpoint not available, using release data only');
            }

            return { release, bookSummaries };
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
                            data={getHymnalsFromRelease(data?.release, data?.bookSummaries || []).filter((item) => {
                                // check if the item is already in the context
                                const exists = context?.BOOK_DATA && Object.keys(context.BOOK_DATA).some(book => context.BOOK_DATA[book].name.short === item.id);
                                return !exists;
                            })}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={[styles.scrollView, { flexGrow: 1 }]}
                            ListHeaderComponent={(
                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    <StyledText style={styles.descriptionText}>{i18n.t('addHymnalSubtitle')}</StyledText>
                                </View>
                            )}
                            renderItem={({ item }) => {
                                // Get BookSummary from merged data, context, or use defaults
                                const bookData = item.bookSummary || context?.BOOK_DATA?.[item.id];
                                const primaryColor = bookData?.primaryColor || '#4A90E2';
                                const secondaryColor = bookData?.secondaryColor || '#357ABD';
                                const displayName = bookData?.name?.medium || item.id;
                                const hymnalId = item.id;

                                return (
                                    <TouchableOpacity
                                        onPress={async () => {
                                            // if already downloading don't do anything
                                            if ((context?.downloadProgressValues?.[hymnalId] ?? 0) === -1 || (context?.downloadProgressValues?.[hymnalId] ?? 0) > 0) return;


                                            context?.setDownloadProgressValues((prev) => ({ ...prev, [hymnalId]: 0 }));
                                            posthog.capture('hymnal_download_started', {
                                                hymnal_id: hymnalId,
                                            });
                                            await downloadHymnal(hymnalId, item.sha256, (progress) => {
                                                context?.setDownloadProgressValues((prev) => ({ ...prev, [hymnalId]: progress }));
                                            }, (success) => {
                                                if (!success) {
                                                    posthog.capture('hymnal_download_failed', {
                                                        hymnal_id: hymnalId,
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
                                                                context?.deleteHymnal?.(hymnalId);
                                                            },
                                                            style: 'default'
                                                        },
                                                        
                                                    ]);
                                                }
                                                // reset the progress value
                                                context?.setDownloadProgressValues((prev) => ({ ...prev, [hymnalId]: 0 }));
                                            });

                                            // reload the data
                                            const loadedData = await loadHymnals();

                                            if (!context) return;
                                            context?.SET_BOOK_DATA(loadedData);

                                            refetch();
                                        }}
                                        style={styles.buttonContainer}
                                        activeOpacity={0.7} // Adjust this value to control the darkness
                                    >
                                        <View style={[styles.gradient, { position: 'relative', overflow: 'hidden' }]}>
                                            <LinearGradient
                                                colors={[primaryColor, secondaryColor]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                                            />
                                            {/* Progress line at the bottom */}
                                            {((context?.downloadProgressValues[hymnalId] ?? 0) > 0 || (context?.downloadProgressValues[hymnalId] ?? 0) === -1 || (context?.downloadProgressValues[hymnalId] ?? 0) > 100) && (
                                                <ProgressLine 
                                                    progress={
                                                        (context?.downloadProgressValues[hymnalId] ?? 0) === -1 ? 0 : 
                                                        (context?.downloadProgressValues[hymnalId] ?? 0) > 100 ? 100 : 
                                                        Math.min(Math.max((context?.downloadProgressValues[hymnalId] ?? 0), 0), 100)
                                                    }
                                                    isIntermediate={(context?.downloadProgressValues[hymnalId] ?? 0) === -1 || (context?.downloadProgressValues[hymnalId] ?? 0) > 100}
                                                />
                                            )}
                                            <View style={{ zIndex: 1 }}>
                                                <StyledText style={styles.buttonText}>{displayName}</StyledText>
                                                {context?.downloadProgressValues[hymnalId] === -1 ? (
                                                    <StyledText style={{ color: 'white', marginTop: 5 }}>{i18n.t('startingDownload')}</StyledText>
                                                ) : ((context?.downloadProgressValues[hymnalId] ?? 0) > 100) ? (
                                                    <StyledText style={{ color: 'white', marginTop: 5 }}>{i18n.t('verifying')}</StyledText>
                                                ) : (context?.downloadProgressValues[hymnalId] ?? 0) > 0 ? (
                                                    <StyledText style={{ color: 'white', marginTop: 5 }}>{`${i18n.t('progress')}: ${Math.min((context?.downloadProgressValues[hymnalId] ?? 0), 100).toFixed(1)}%`}</StyledText>
                                                ) : (
                                                    <StyledText style={{ color: 'white', marginTop: 5 }}>{`${i18n.t('size')}: ${((item.size ?? 0) / (1024 * 1024)).toFixed(2)} MB`}</StyledText>
                                                )}
                                            </View>
                                            {(context?.downloadProgressValues[hymnalId] ?? 0) === 0 && (
                                                <View style={{ position: 'absolute', right: 20, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 2 }}>
                                                    <IconSymbol name="plus.circle" size={32} weight='light' color="white" />
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
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