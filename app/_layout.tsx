import { DarkTheme, DefaultTheme, ThemeProvider, useRoute, RouteProp, NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Link, router, Stack, useNavigation } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'react-native-reanimated';
import {setBackgroundColorAsync} from 'expo-system-ui';
import { useColorScheme } from '@/hooks/useColorScheme';
import { loadHymnals } from '@/scripts/hymnals';
import { HymnalContext, HymnalContextType } from '@/constants/context';
import { Bookmark, BookSummary } from '@/constants/types';
import { Button, Pressable, TouchableOpacity, View, Text, Appearance } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { PostHogProvider } from 'posthog-react-native'
import { translations } from '@/constants/localization';
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import { decode, encode } from 'base-64';
import DefaultPreference from 'react-native-default-preference';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import StyledText from '@/components/StyledText';
import TrackPlayer, { Capability } from 'react-native-track-player';
import { PlaybackService } from '@/scripts/track_player';
import { ensurePlayerSetup } from '@/scripts/track_player_setup';
import { validate_token } from '@/scripts/broadcast';
import { FirebaseAuthTypes, getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { HeaderButton } from '@react-navigation/elements';

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

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const theme = colorScheme ?? 'light';
    setBackgroundColorAsync(Colors[theme].background);
    const [appIsReady, setAppIsReady] = useState(false);
    const [loaded] = useFonts({
        Regular: require('@/assets/fonts/Lato-Regular.ttf'),
        Bold: require('@/assets/fonts/Lato-Bold.ttf'),
        Italic: require('@/assets/fonts/Lato-Italic.ttf'),
        Light: require('@/assets/fonts/Lato-Light.ttf'),
        LightItalic: require('@/assets/fonts/Lato-LightItalic.ttf'),
        Black: require('@/assets/fonts/Lato-Black.ttf'),
        BlackItalic: require('@/assets/fonts/Lato-BlackItalic.ttf'),
    });

    Appearance.addChangeListener(async (e) => {
        await setBackgroundColorAsync(Colors[e.colorScheme ?? 'light'].background);
        console.log('root color is now: ' + Colors[e.colorScheme ?? 'light'].background);
    })


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

    useEffect(() => {
        const appliedTheme =
            themeOverride === 'system' || themeOverride === null
                ? null // system default
                : themeOverride;

        Appearance.setColorScheme(appliedTheme as any);
    }, [themeOverride]);

    // save preferences to async storage
    useEffect(() => {


        console.log('Saving preferences...');
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
            setBroadcastingChurch
        };
    }, [BOOK_DATA, SET_BOOK_DATA, onLayoutRootView, downloadProgressValues, setDownloadProgressValues, legacyNumberGrouping, setLegacyNumberGrouping, languageOverride, setLanguageOverride, postHogOptedIn, setPostHogOptedIn, invertSheetMusic, setInvertSheetMusic, themeOverride, setThemeOverride, discoverPageVisited, setDiscoverPageVisited, broadcastingToken, setBroadcastingToken, broadcastingChurch, setBroadcastingChurch]);
    // Load hymnal data

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = languageOverride ?? getLocales()[0].languageCode ?? 'en';

    function handleAuthStateChanged(user: FirebaseAuthTypes.User | null) {
        setUser(user);
    }


    useEffect(() => {
        onAuthStateChanged(getAuth(), handleAuthStateChanged);

        // load preferences from async storage
        AsyncStorage.getItem('discoverPageVisited').then(async (value) => {
            if (value !== null)
                setDiscoverPageVisited(value === 'true');
        });
        AsyncStorage.getItem('legacyNumberGrouping').then(async (value) => {
            if (value !== null)
                setLegacyNumberGrouping(value === 'true');
        });
        AsyncStorage.getItem('languageOverride').then((value) => {
            if (value !== null)
                setLanguageOverride(value);
        });
        AsyncStorage.getItem('postHogOptedIn').then((value) => {
            if (value !== null)
                setPostHogOptedIn(value === 'true');
        });
        AsyncStorage.getItem('themeOverride').then((value) => {
            if (value !== null)
                setThemeOverride(value);
        });
        AsyncStorage.getItem('invertSheetMusic').then(async (value) => {
            if (value !== null)
                setInvertSheetMusic(value === 'true');
        });
        AsyncStorage.getItem('broadcastingToken').then(async (value) => {
            if (value !== null) {
                let response = await validate_token(value);
                if (response.status == 200) {
                    setBroadcastingToken(value);
                } else {
                    setBroadcastingToken(null);
                }
            }
        });
        AsyncStorage.getItem('broadcastingChurch').then(async (value) => {
            if (value !== null)
                setBroadcastingChurch(value);
        });

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
                setAppIsReady(true);
            }
        }).catch((error) => {
            console.error("Error loading hymnals:", error);
        });
    }, [loaded]);


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
        }} autocapture={{captureScreens: false}}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <HymnalContext.Provider value={context}>
                        <QueryClientProvider client={new QueryClient()}>
                            <BottomSheetModalProvider>
                                <Stack screenOptions={{ headerTitleAlign: 'center', headerShown: false}}>
                                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                                    <Stack.Screen
                                        name="hymnal_importer"
                                        options={{
                                            headerShown: true,
                                            headerTitle: i18n.t('addHymnal'),
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
                        </QueryClientProvider>
                    </HymnalContext.Provider>
                </ThemeProvider>
            </GestureHandlerRootView>
        </PostHogProvider>
    );
}
