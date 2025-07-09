import { HymnalMoreMenu } from "@/components/HymnalMoreMenu";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { HymnalContext } from "@/constants/context";
import { translations } from "@/constants/localization";
import { Ionicons } from "@expo/vector-icons";
import { getLocales } from "expo-localization";
import { router, Stack } from "expo-router";
import { I18n } from "i18n-js";
import { useContext } from "react";
import { Pressable, TouchableOpacity, useColorScheme } from "react-native";

export default function HomeLayout() {
    const theme = useColorScheme() ?? 'light';
    const context = useContext(HymnalContext);
    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    return (
        <Stack screenOptions={{ headerShown: false, headerTitleAlign: 'center' }}
            initialRouteName="index">
            <Stack.Screen
                name="index"
                options={{ title: 'Home' }}
            />
            <Stack.Screen
                name="preferences"
                options={{ 
                    title: 'Preferences',
                    headerShown: true, 
                    headerTitleAlign: 'center',
                    headerBackTitle: i18n.t('back'),
                    headerTransparent: true,
                    headerShadowVisible: false,
                }}
            />
            <Stack.Screen
                name="help"
                options={{ 
                    title: i18n.t('help'),
                    headerShown: true, 
                    headerTitleAlign: 'center',
                    headerBackTitle: i18n.t('back'),
                    headerTransparent: true,
                    headerShadowVisible: false,
                }}
            />
            <Stack.Screen
                name="broadcast_bible"
                options={{ 
                    title: i18n.t('setBibleReading'),
                    headerShown: true, 
                    headerTitleAlign: 'center',
                    headerBackTitle: i18n.t('back'),
                    headerTransparent: true,
                    headerShadowVisible: false,
                }}
            />
            <Stack.Screen
                name="broadcast_song"
                options={{ 
                    title: i18n.t('setSongNumber'),
                    headerShown: true, 
                    headerTitleAlign: 'center',
                    headerBackTitle: i18n.t('back'),
                    headerTransparent: true,
                    headerShadowVisible: false,
                }}
            />
            <Stack.Screen
                name="broadcast_options"
                options={{ 
                    title: i18n.t('broadcast'),
                    headerShown: true, 
                    headerTitleAlign: 'center',
                    headerBackTitle: i18n.t('back'),
                    headerTransparent: true,
                    headerShadowVisible: false,
                }}
            />
            <Stack.Screen
                name="broadcast"
                options={{ 
                    title: i18n.t('broadcast'),
                    headerShown: true, 
                    headerTitleAlign: 'center',
                    headerBackTitle: i18n.t('back'),
                    headerTransparent: true,
                    headerShadowVisible: false,
                }}
            />
            <Stack.Screen
                name="language"
                options={{ 
                    title: i18n.t('language'),
                    headerShown: true, 
                    headerTitleAlign: 'center',
                    headerBackTitle: i18n.t('back'),
                    headerTransparent: true,
                    headerShadowVisible: false,
                }}
            />
            <Stack.Screen
                name="theme"
                options={{ 
                    title: i18n.t('theme'),
                    headerShown: true, 
                    headerTitleAlign: 'center',
                    headerBackTitle: i18n.t('back'),
                    headerTransparent: true,
                    headerShadowVisible: false,
                }}
            />
        </Stack>
    );
}