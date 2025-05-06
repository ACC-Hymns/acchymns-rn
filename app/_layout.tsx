import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Link, router, Stack, useNavigation } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { loadHymnals } from '@/scripts/hymnals';
import { HymnalContext, HymnalContextType } from '@/constants/context';
import { BookSummary } from '@/constants/types';
import { Button, Pressable, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
    const [appIsReady, setAppIsReady] = useState(false);
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    const [BOOK_DATA, SET_BOOK_DATA] = useState<Record<string, BookSummary>>({});

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
        };
    }, [BOOK_DATA, SET_BOOK_DATA]);
    // Load hymnal data


    useEffect(() => {
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

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <HymnalContext.Provider value={context}>
                    <QueryClientProvider client={new QueryClient()}>
                        <Stack initialRouteName='(tabs)'>
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                            <Stack.Screen 
                                name="hymnal_importer" 
                                options={{ 
                                headerShown: false, 
                                presentation: 'modal', 
                                }}
                            />
                            <Stack.Screen
                                name="display/[id]/[number]"
                                options={{
                                    title: 'number',
                                    headerShown: true,
                                    headerBackVisible: false,
                                    headerLeft: () => (
                                        <TouchableOpacity hitSlop={10} onPress={() => router.back()} style={{ padding: 10 }}>
                                            <IconSymbol
                                                name="chevron.left"
                                                size={18}
                                                weight="medium"
                                                color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                                            />
                                        </TouchableOpacity>
                                    ),
                                }}
                            />
                            <Stack.Screen name="+not-found" />
                            <Stack.Screen name='index' options={{ headerShown: false }} />
                        </Stack>
                        <StatusBar style="auto" />
                    </QueryClientProvider>
                </HymnalContext.Provider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
