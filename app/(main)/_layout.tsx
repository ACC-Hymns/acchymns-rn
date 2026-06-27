import { Colors } from "@/constants/Colors";
import EcampSingingBanner from "@/components/EcampSingingBanner";
import { useI18n } from "@/hooks/useI18n";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { router, Stack } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";

function isGhostDisplayRoute(ghost: string | string[] | undefined): boolean {
    if (Array.isArray(ghost)) {
        return ghost[0] === '1';
    }

    return ghost === '1';
}

export default function MainStackLayout() {
    const effectiveTheme: 'light' | 'dark' = useColorScheme() === 'dark' ? 'dark' : 'light';
    const i18n = useI18n();
    return (
        <ThemeProvider value={effectiveTheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1 }}>
            <Stack
                initialRouteName="(tabs)"
                screenOptions={{ contentStyle: { flex: 1 } }}
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
            <Stack.Screen
                name="display/[id]/[number]"
                options={({ route }) => ({
                    headerShown: false,
                    animation: isGhostDisplayRoute(
                        (route.params as { ghost?: string | string[] } | undefined)?.ghost,
                    )
                        ? 'none'
                        : 'default',
                })}
            />
            <Stack.Screen name="+not-found" />
            </Stack>
            <EcampSingingBanner />
        </View>
        </ThemeProvider>
    );
}