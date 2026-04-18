import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { getLoadedFonts, useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'react-native-reanimated';
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { setBackgroundColorAsync } from 'expo-system-ui';
import { useColorScheme } from '@/hooks/useColorScheme';
import { loadHymnals, removeHymnal } from '@/scripts/hymnals';
import { HymnalContext, HymnalContextType } from '@/constants/context';
import { BookSummary } from '@/constants/types';
import { View, Appearance } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostHogProvider } from 'posthog-react-native'
import { useI18n } from '@/hooks/useI18n';
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import { decode, encode } from 'base-64';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import StyledText from '@/components/StyledText';
import TrackPlayer, { Capability } from 'react-native-track-player';
import { PlaybackService } from '@/scripts/track_player';
import { ensurePlayerSetup } from '@/scripts/track_player_setup';
import { validate_token } from '@/scripts/broadcast';
import { FirebaseAuthTypes, getAuth, onAuthStateChanged } from '@react-native-firebase/auth';

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
    const colorScheme = useColorScheme();
    const theme = colorScheme ?? 'light';
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

    // Set background color on mount and theme change
    useEffect(() => {
        setBackgroundColorAsync(Colors[theme].background);
    }, [theme]);

    // Add Appearance listener with proper cleanup
    useEffect(() => {
        const subscription = Appearance.addChangeListener(async (e) => {
            await setBackgroundColorAsync(Colors[e.colorScheme ?? 'light'].background);
        });
        
        return () => {
            subscription.remove();
        };
    }, []);


    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

    const [BOOK_DATA, SET_BOOK_DATA] = useState<Record<string, BookSummary>>({});
    const [downloadProgressValues, setDownloadProgressValues] = useState<Record<string, number>>({});

    const [discoverPageVisited, setDiscoverPageVisited] = useState<boolean | null>(null);
    const [legacyNumberGrouping, setLegacyNumberGrouping] = useState<boolean | null>(null);
    const [languageOverride, setLanguageOverride] = useState<string | null>(null);
    const [postHogOptedIn, setPostHogOptedIn] = useState<boolean | null>(null);
    const [themeOverride, setThemeOverride] = useState<string | null>(null);
    const [invertSheetMusic, setInvertSheetMusic] = useState<boolean | null>(null);
    const [broadcastingToken, setBroadcastingToken] = useState<string | null>(null);
    const [broadcastingChurch, setBroadcastingChurch] = useState<string | null>(null);

    const savePreferences = async () => {
        try {
            if (discoverPageVisited !== null)
                await AsyncStorage.setItem('discoverPageVisited', discoverPageVisited.toString());

            if (legacyNumberGrouping !== null)
                await AsyncStorage.setItem('legacyNumberGrouping', legacyNumberGrouping.toString());

            if (languageOverride !== null)
                await AsyncStorage.setItem('languageOverride', languageOverride);

            if (postHogOptedIn !== null)
                await AsyncStorage.setItem('postHogOptedIn', postHogOptedIn.toString());

            if (themeOverride !== null)
                await AsyncStorage.setItem('themeOverride', themeOverride);

            if (invertSheetMusic !== null)
                await AsyncStorage.setItem('invertSheetMusic', invertSheetMusic.toString());

            if (broadcastingToken !== null)
                await AsyncStorage.setItem('broadcastingToken', broadcastingToken);

            if (broadcastingChurch !== null)
                await AsyncStorage.setItem('broadcastingChurch', broadcastingChurch);

            console.log('Saved preferences.');
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    const resetPreferences = async () => {
        try {
            await AsyncStorage.setItem('discoverPageVisited', "");
            await AsyncStorage.setItem('legacyNumberGrouping', "");
            await AsyncStorage.setItem('languageOverride', "");
            await AsyncStorage.setItem('postHogOptedIn', "");
            await AsyncStorage.setItem('themeOverride', "");
            await AsyncStorage.setItem('invertSheetMusic', "");
            await AsyncStorage.setItem('broadcastingToken', "");
            await AsyncStorage.setItem('broadcastingChurch', "");

            setDiscoverPageVisited(null);
            setLegacyNumberGrouping(null);
            setLanguageOverride(null);
            setPostHogOptedIn(null);
            setThemeOverride(null);
            setInvertSheetMusic(null);
            setBroadcastingToken(null);
            setBroadcastingChurch(null);

            console.log('Saved preferences.');
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    useEffect(() => {
        const appliedTheme =
            themeOverride === 'system' || themeOverride === null
                ? null // system default
                : themeOverride;

        Appearance.setColorScheme(appliedTheme as any);
    }, [themeOverride]);


    const deleteHymnal = async (book: string) => {
        console.log(`Deleting ${book}...`);

        try {
            // Run deletions
            await removeHymnal(book);

            // Batch state updates:
            // Update progress and book data simultaneously
            context?.setDownloadProgressValues((prev) => {
                const { [book]: _, ...rest } = prev; // Clean way to delete key
                return rest;
            });

            // Reload the master list
            const updatedBooks = await loadHymnals();
            context?.SET_BOOK_DATA(updatedBooks);

            console.log("Hymnal deleted and state reloaded.");
        } catch (error) {
            console.error("Failed to delete hymnal:", error);
        }
    }

    // save preferences to async storage
    useEffect(() => {


        console.log('Saving preferences...');

        savePreferences();
    }, [legacyNumberGrouping, languageOverride, postHogOptedIn, themeOverride, invertSheetMusic, discoverPageVisited, broadcastingToken, broadcastingChurch]);

    const onLayoutRootView = useCallback(() => {
        if (appIsReady) {
            SplashScreen.hideAsync();
        }
    }, [appIsReady]);

    const context: HymnalContextType = useMemo(() => {
        return {
            BOOK_DATA,
            SET_BOOK_DATA,
            onLayoutHomeView: onLayoutRootView,
            downloadProgressValues,
            setDownloadProgressValues,
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
            resetPreferences,
            deleteHymnal
        };
    }, [BOOK_DATA, SET_BOOK_DATA, onLayoutRootView, downloadProgressValues, setDownloadProgressValues, legacyNumberGrouping, setLegacyNumberGrouping, languageOverride, setLanguageOverride, postHogOptedIn, setPostHogOptedIn, invertSheetMusic, setInvertSheetMusic, themeOverride, setThemeOverride, discoverPageVisited, setDiscoverPageVisited, broadcastingToken, setBroadcastingToken, broadcastingChurch, setBroadcastingChurch]);
    
    // Use shared I18n hook
    const i18n = useI18n();

    function handleAuthStateChanged(user: FirebaseAuthTypes.User | null) {
        setUser(user);
    }


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(), handleAuthStateChanged);

        // Load preferences from async storage - batch operations
        const loadPreferences = async () => {
            try {
                const [
                    discoverPageVisited,
                    legacyNumberGrouping,
                    languageOverride,
                    postHogOptedIn,
                    themeOverride,
                    invertSheetMusic,
                    broadcastingToken,
                    broadcastingChurch
                ] = await Promise.all([
                    AsyncStorage.getItem('discoverPageVisited'),
                    AsyncStorage.getItem('legacyNumberGrouping'),
                    AsyncStorage.getItem('languageOverride'),
                    AsyncStorage.getItem('postHogOptedIn'),
                    AsyncStorage.getItem('themeOverride'),
                    AsyncStorage.getItem('invertSheetMusic'),
                    AsyncStorage.getItem('broadcastingToken'),
                    AsyncStorage.getItem('broadcastingChurch')
                ]);

                if (discoverPageVisited !== null)
                    setDiscoverPageVisited(discoverPageVisited === 'true');
                if (legacyNumberGrouping !== null)
                    setLegacyNumberGrouping(legacyNumberGrouping === 'true');
                if (languageOverride !== null)
                    setLanguageOverride(languageOverride);
                if (postHogOptedIn !== null)
                    setPostHogOptedIn(postHogOptedIn === 'true');
                if (themeOverride !== null)
                    setThemeOverride(themeOverride);
                if (invertSheetMusic !== null)
                    setInvertSheetMusic(invertSheetMusic === 'true');
                if (broadcastingChurch !== null)
                    setBroadcastingChurch(broadcastingChurch);
                
                // Validate broadcasting token
                if (broadcastingToken !== null) {
                    try {
                        const response = await validate_token(broadcastingToken);
                        if (response.status == 200) {
                            setBroadcastingToken(broadcastingToken);
                        } else {
                            setBroadcastingToken(null);
                        }
                    } catch (error) {
                        console.error('Error validating token:', error);
                        setBroadcastingToken(null);
                    }
                }
            } catch (error) {
                console.error('Error loading preferences:', error);
            }
        };

        loadPreferences();

        // register TrackPlayer
        TrackPlayer.registerPlaybackService(() => PlaybackService);

        const setup = async () => {
            try {
                // ensurePlayerSetup uses a module-level flag so this becomes a no-op
                // if the player was already initialized earlier in the app lifecycle.
                await ensurePlayerSetup();

                TrackPlayer.updateOptions({
                    // Media controls capabilities
                    capabilities: [
                        Capability.Play,
                        Capability.Pause,
                        Capability.JumpBackward,
                        Capability.JumpForward,
                        Capability.SeekTo
                    ]
                });
            } catch (error) {
                console.error('TrackPlayer setup failed:', error);
            }
        };
        setup();

        const data = loadHymnals();
        data.then((data) => {
            SET_BOOK_DATA(data);
            if (loaded) {
                console.log("attmpted to load fonts...");
                if (error)
                    console.log(error);

                setAppIsReady(true);
            }
        }).catch((error) => {
            console.error("Error loading hymnals:", error);
        });

        return () => {
            unsubscribe();
        };
    }, [loaded, SET_BOOK_DATA]);



    if (!appIsReady) {
        return null;
    }

    const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
    if (!POSTHOG_API_KEY) {
        console.error('POSTHOG_API_KEY is not set');
    }

    return (
        <PostHogProvider apiKey={POSTHOG_API_KEY} options={{
            host: "https://us.i.posthog.com",
        }} autocapture={{ captureScreens: false }}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <HymnalContext.Provider value={context}>
                        <QueryClientProvider client={queryClient}>
                            <KeyboardProvider>
                                <BottomSheetModalProvider>
                                    <Stack screenOptions={{ headerTitleAlign: 'center', headerShown: false }}>
                                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                                        <Stack.Screen
                                            name="hymnal_importer"
                                            options={{
                                                headerShown: true,
                                                headerTitle: i18n.t('addHymnal'),
                                                headerTintColor: Colors[theme].tint,
                                                headerStyle: {
                                                    backgroundColor: Colors[theme].background,
                                                },
                                                unstable_headerLeftItems: () => [
                                                    {
                                                        type: 'button',
                                                        label: 'Back',
                                                        icon: {
                                                            type: 'sfSymbol',
                                                            name: 'chevron.left'
                                                        },
                                                        tintColor: Colors[theme].icon,
                                                        onPress: () => {
                                                            router.back();
                                                        }
                                                    }
                                                ],
                                                headerShadowVisible: false,
                                                presentation: 'modal',
                                            }}
                                        />
                                        <Stack.Screen name="+not-found" />
                                    </Stack>
                                    <StatusBar style="auto" />
                                </BottomSheetModalProvider>
                            </KeyboardProvider>
                        </QueryClientProvider>
                    </HymnalContext.Provider>
                </ThemeProvider>
            </GestureHandlerRootView>
        </PostHogProvider>
    );
}
