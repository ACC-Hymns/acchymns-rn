import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import Ionicons from '@react-native-vector-icons/ionicons'
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { router, Stack } from "expo-router";
import React from "react";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function MainStackLayout() {
    const effectiveTheme: 'light' | 'dark' = useColorScheme() === 'dark' ? 'dark' : 'light';
    const i18n = useI18n();
    return (
        <ThemeProvider value={effectiveTheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
            initialRouteName="(tabs)"
        >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
                name="hymnal_importer"
                options={{
                    headerShown: true,
                    headerTitle: i18n.t('addHymnal'),
                    headerTintColor: Colors[effectiveTheme].tint,
                    headerStyle: {
                        backgroundColor: Colors[effectiveTheme].background,
                    },
                    unstable_headerLeftItems: () => [
                        {
                            type: 'button',
                            label: 'Back',
                            icon: {
                                type: 'sfSymbol',
                                name: 'chevron.left'
                            },
                            tintColor: Colors[effectiveTheme].icon,
                            onPress: () => {
                                router.back();
                            }
                        }
                    ],
                    headerShadowVisible: false,
                    presentation: 'modal',
                }}
            />
            <Stack.Screen name="display/[id]/[number]" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
        </Stack>
        </ThemeProvider>
    );
}