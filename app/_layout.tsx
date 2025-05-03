import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { createContext, useEffect, useMemo, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { loadHymnals } from '@/scripts/hymnals';
import { HymnalContext, HymnalContextType } from '@/constants/context';
import { BookSummary } from '@/constants/types';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    const [BOOK_DATA, SET_BOOK_DATA] = useState<Record<string, BookSummary>>({});

    const context: HymnalContextType = useMemo(() => {
        return {
            BOOK_DATA,
            SET_BOOK_DATA,
        };
    }, [BOOK_DATA, SET_BOOK_DATA]);
    // Load hymnal data


    useEffect(() => {
        const data = loadHymnals();
        data.then((data) => {
            SET_BOOK_DATA(data);
        }).catch((error) => {
            console.error("Error loading hymnals:", error);
        });
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }

    return (
        
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <HymnalContext.Provider value={context}>
                <Stack initialRouteName='(tabs)'>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="hymnal_importer" options={{ headerShown: false }}/>
                    <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
            </HymnalContext.Provider>
        </ThemeProvider>
    );
}
