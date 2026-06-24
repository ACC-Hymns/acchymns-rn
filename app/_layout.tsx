import { DarkTheme, DefaultTheme } from 'expo-router/react-navigation';
import { getLoadedFonts, useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'react-native-reanimated';
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { setBackgroundColorAsync } from 'expo-system-ui';
import { useColorScheme } from '@/hooks/useColorScheme';
import { loadHymnals, removeHymnal, setHymnalDownloadProgressUpdater } from '@/scripts/hymnals';
import { buildHymnalUpdatesQueryKey, optimisticallyMarkHymnalUpToDate } from '@/hooks/useHymnalUpdates';
import { fetchHymnalReleaseData } from '@/scripts/hymnalUpdates';
import { DownloadProgressContext, HymnalContext, HymnalContextType } from '@/constants/context';
import { BookSummary } from '@/constants/types';
import { View } from 'react-native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PostHogProvider } from 'posthog-react-native'
import { PostHogIdentity } from '@/components/PostHogIdentity';
import { getOrCreateStableUserId } from '@/scripts/userIdentity';
import { useI18n } from '@/hooks/useI18n';
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import { decode, encode } from 'base-64';
import { BottomSheetModalProvider } from '@expo/ui/community/bottom-sheet';
import TrackPlayer from '@rntp/player';
import { BackgroundEvent, Event } from '@rntp/player';
import { configureTrackPlayerCommands, registerTrackPlayerMediaSessionRefresh } from '@/constants/trackPlayer';
import { usePreferences } from '@/hooks/usePreferences';


global.Buffer = Buffer;
global.process = require('process');
global.btoa = encode;
global.atob = decode;

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Set the animation options. This is optional.
SplashScreen.setOptions({
    duration: 1000,
    fade: true,
});

// Create QueryClient singleton to avoid recreating on every render
// Configure with iOS-friendly settings
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            refetchOnReconnect: true,
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        },
    },
});

export default function RootLayout() {
    const systemColorScheme = useColorScheme();
    const [appIsReady, setAppIsReady] = useState(false);
    const [loaded, error] = useFonts({
        LatoRegular: require('@/assets/fonts/latoregular.ttf'),
        LatoBold: require('@/assets/fonts/latobold.ttf'),
        LatoItalic: require('@/assets/fonts/latoitalic.ttf'),
        LatoLight: require('@/assets/fonts/latolight.ttf'),
        LatoLightItalic: require('@/assets/fonts/latolightitalic.ttf'),
        LatoBlack: require('@/assets/fonts/latoblack.ttf'),
        LatoBlackItalic: require('@/assets/fonts/latoblackitalic.ttf'),
    });

    useEffect(() => {
        const setup = async () => {
            try {
                TrackPlayer.registerBackgroundEventHandler(() => async (event: BackgroundEvent) => {
                    switch (event.type) {
                        case Event.RemotePlay: await TrackPlayer.play(); break;
                        case Event.RemotePause: await TrackPlayer.pause(); break;
                        case Event.RemoteSeek: await TrackPlayer.seekTo(event.position); break;
                        case Event.RemoteSkipBackward: await TrackPlayer.seekBy(-10); break;
                        case Event.RemoteSkipForward: await TrackPlayer.seekBy(10); break;
                    }
                });

                TrackPlayer.destroy();
                TrackPlayer.setupPlayer({
                    contentType: 'music',
                    handleAudioBecomingNoisy: true,
                });
                configureTrackPlayerCommands();
            } catch (error) {
                console.error('TrackPlayer setup failed:', error);
            }
        };
        setup();
    }, []);

    useEffect(() => registerTrackPlayerMediaSessionRefresh(), []);

    const [stableUserId, setStableUserId] = useState<string | null>(null);

    const [BOOK_DATA, SET_BOOK_DATA] = useState<Record<string, BookSummary>>({});
    const [hymnalsLoaded, setHymnalsLoaded] = useState(false);
    const [downloadProgressValues, setDownloadProgressValues] = useState<Record<string, number>>({});
    const [dismissedHymnalPackages, setDismissedHymnalPackages] = useState<Record<string, true>>({});
    const homeLayoutDoneRef = useRef(false);
    const featureFlagsReadyRef = useRef(false);

    useEffect(() => {
        setHymnalDownloadProgressUpdater((book, progress) => {
            setDownloadProgressValues((prev) => {
                if (progress === 0) {
                    const { [book]: _, ...rest } = prev;
                    return rest;
                }
                return { ...prev, [book]: progress };
            });
        });

        return () => setHymnalDownloadProgressUpdater(null);
    }, []);

    const {
        discoverPageVisited,
        setDiscoverPageVisited,
        legacyNumberGrouping,
        setLegacyNumberGrouping,
        languageOverride,
        setLanguageOverride,
        postHogOptedIn,
        setPostHogOptedIn,
        themeOverride,
        setThemeOverride,
        invertSheetMusic,
        setInvertSheetMusic,
        broadcastingToken,
        setBroadcastingToken,
        broadcastingChurch,
        setBroadcastingChurch,
        hymnalReleaseTag,
        setHymnalReleaseTag,
        resetPreferences,
        isPreferencesLoaded,
    } = usePreferences();

    const effectiveTheme: 'light' | 'dark' =
        themeOverride === 'light' || themeOverride === 'dark'
            ? themeOverride
            : (systemColorScheme ?? 'light');

    const dismissHymnalPackage = useCallback((book: string) => {
        setDismissedHymnalPackages((prev) => ({ ...prev, [book]: true }));
    }, []);

    const clearDismissedHymnalPackage = useCallback((book: string) => {
        setDismissedHymnalPackages((prev) => {
            const { [book]: _, ...rest } = prev;
            return rest;
        });
    }, []);

    const clearAllDismissedHymnalPackages = useCallback(() => {
        setDismissedHymnalPackages({});
    }, []);

    const previousReleaseTag = useRef<string | null | undefined>(undefined);
    useEffect(() => {
        if (previousReleaseTag.current === undefined) {
            previousReleaseTag.current = hymnalReleaseTag;
            return;
        }
        if (previousReleaseTag.current !== hymnalReleaseTag) {
            clearAllDismissedHymnalPackages();
            previousReleaseTag.current = hymnalReleaseTag;
        }
    }, [clearAllDismissedHymnalPackages, hymnalReleaseTag]);

    const completeHymnalPackage = useCallback(async (book: string, digest: string) => {
        dismissHymnalPackage(book);
        optimisticallyMarkHymnalUpToDate(
            queryClient,
            buildHymnalUpdatesQueryKey(hymnalReleaseTag),
            book,
            digest,
        );
        const loadedData = await loadHymnals();
        SET_BOOK_DATA(loadedData);
    }, [dismissHymnalPackage, hymnalReleaseTag]);

    const deleteHymnal = useCallback(async (book: string) => {
        try {
            await removeHymnal(book);

            setDownloadProgressValues((prev) => {
                const { [book]: _, ...rest } = prev;
                return rest;
            });
            clearDismissedHymnalPackage(book);

            const updatedBooks = await loadHymnals();
            SET_BOOK_DATA(updatedBooks);
        } catch (error) {
            console.error("Failed to delete hymnal:", error);
        }
    }, [clearDismissedHymnalPackage]);

    const tryHideSplash = useCallback(() => {
        if (
            appIsReady
            && homeLayoutDoneRef.current
            && featureFlagsReadyRef.current
        ) {
            SplashScreen.hideAsync();
        }
    }, [appIsReady]);

    const onLayoutRootView = useCallback(() => {
        homeLayoutDoneRef.current = true;
        tryHideSplash();
    }, [tryHideSplash]);

    const onFeatureFlagsReady = useCallback(() => {
        featureFlagsReadyRef.current = true;
        tryHideSplash();
    }, [tryHideSplash]);

    const context: HymnalContextType = useMemo(() => {
        return {
            BOOK_DATA,
            SET_BOOK_DATA,
            onLayoutHomeView: onLayoutRootView,
            setDownloadProgressValues,
            dismissedHymnalPackages,
            dismissHymnalPackage,
            clearDismissedHymnalPackage,
            clearAllDismissedHymnalPackages,
            completeHymnalPackage,
            discoverPageVisited,
            setDiscoverPageVisited,
            legacyNumberGrouping,
            setLegacyNumberGrouping,
            languageOverride,
            setLanguageOverride,
            postHogOptedIn,
            setPostHogOptedIn,
            themeOverride,
            setThemeOverride,
            invertSheetMusic,
            setInvertSheetMusic,
            broadcastingToken,
            setBroadcastingToken,
            broadcastingChurch,
            setBroadcastingChurch,
            hymnalReleaseTag,
            setHymnalReleaseTag,
            resetPreferences,
            deleteHymnal
        };
    }, [
        BOOK_DATA,
        SET_BOOK_DATA,
        onLayoutRootView,
        setDownloadProgressValues,
        dismissedHymnalPackages,
        dismissHymnalPackage,
        clearDismissedHymnalPackage,
        clearAllDismissedHymnalPackages,
        completeHymnalPackage,
        discoverPageVisited,
        setDiscoverPageVisited,
        legacyNumberGrouping,
        setLegacyNumberGrouping,
        languageOverride,
        setLanguageOverride,
        postHogOptedIn,
        setPostHogOptedIn,
        themeOverride,
        setThemeOverride,
        invertSheetMusic,
        setInvertSheetMusic,
        broadcastingToken,
        setBroadcastingToken,
        broadcastingChurch,
        setBroadcastingChurch,
        hymnalReleaseTag,
        setHymnalReleaseTag,
        resetPreferences,
        deleteHymnal,
    ]);

    // Use shared I18n hook
    const i18n = useI18n();


    useEffect(() => {

        getOrCreateStableUserId()
            .then(setStableUserId)
            .catch((error) => {
                console.error('Error loading stable user id:', error);
            });

        loadHymnals()
            .then((data) => {
                SET_BOOK_DATA(data);
                setHymnalsLoaded(true);
            })
            .catch((error) => {
                console.error("Error loading hymnals:", error);
                setHymnalsLoaded(true);
            });
    }, []);

    useEffect(() => {
        if (!loaded || !hymnalsLoaded || !isPreferencesLoaded) {
            return;
        }

        if (error) {
            console.log(error);
        }

        setAppIsReady(true);
    }, [loaded, hymnalsLoaded, isPreferencesLoaded, error]);

    useEffect(() => {
        if (!appIsReady) {
            return;
        }

        const installedBookIds = Object.values(BOOK_DATA).map((book) => book.name.short);
        queryClient.prefetchQuery({
            queryKey: buildHymnalUpdatesQueryKey(hymnalReleaseTag),
            queryFn: async () => {
                const result = await fetchHymnalReleaseData(installedBookIds, hymnalReleaseTag);
                const { outdatedHymnals: _, ...cache } = result;
                return cache;
            },
        }).catch(() => undefined);
    }, [appIsReady, hymnalReleaseTag]);

    if (!appIsReady || !stableUserId) {
        return null;
    }

    const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
    if (!POSTHOG_API_KEY) {
        console.error('POSTHOG_API_KEY is not set');
    }
    return (
        <PostHogProvider apiKey={POSTHOG_API_KEY} options={{
            host: "https://us.i.posthog.com",
            bootstrap: {
                distinctId: stableUserId,
            },
        }} autocapture={{ captureScreens: false }}>
            <PostHogIdentity stableUserId={stableUserId} onFeatureFlagsReady={onFeatureFlagsReady} />
            <GestureHandlerRootView style={{ flex: 1 }}>
                <HymnalContext.Provider value={context}>
                    <DownloadProgressContext.Provider value={downloadProgressValues}>
                    <QueryClientProvider client={queryClient}>
                        <KeyboardProvider>
                            <BottomSheetModalProvider>
                                <Stack
                                    screenOptions={{
                                        headerShown: false,
                                        contentStyle: {
                                            backgroundColor: effectiveTheme === 'dark'
                                                ? DarkTheme.colors.background
                                                : DefaultTheme.colors.background,
                                        },
                                    }}
                                    initialRouteName="(main)"
                                >
                                    <Stack.Screen name="(main)" options={{ headerShown: false }} />
                                </Stack>
                            </BottomSheetModalProvider>
                        </KeyboardProvider>
                    </QueryClientProvider>
                    </DownloadProgressContext.Provider>
                </HymnalContext.Provider>
            </GestureHandlerRootView>
        </PostHogProvider>
    );
}
