import { HymnalMoreMenu } from "@/components/HymnalMoreMenu";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { I18n } from "i18n-js";
import { Ionicons } from "@expo/vector-icons";
import { getLocales } from "expo-localization";
import { router, Stack } from "expo-router";
import { Platform, Text, TouchableOpacity, useColorScheme } from "react-native";
import { useContext, useLayoutEffect, useState } from "react";
import { HymnalContext } from "@/constants/context";
import { translations } from "@/constants/localization";
import StyledText from '@/components/StyledText';

export default function DisplayLayout() {
    const theme = useColorScheme() ?? 'light';
    const context = useContext(HymnalContext);
    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    let isLiquidGlass = false;
    if(Platform.OS === 'ios') {
        const majorVersion = parseInt(Platform.Version, 10);
        if(majorVersion >= 26) {
            isLiquidGlass = true;
        }
    }

    return (
        <Stack screenOptions={{ headerShown: false, headerTitleAlign: 'center' }}>
            <Stack.Screen
                name="index"
                options={{
                    title: 'number',
                    headerShown: true,
                    headerTransparent: isLiquidGlass,
                    headerTitleAlign: 'center',
                    headerBackVisible: false,
                    animation: 'none'
                }}
            />
            <Stack.Screen
                name="broadcast"
                options={{
                    title: i18n.t('broadcast'),
                    headerShown: true,
                    headerTitleAlign: 'center',
                    headerBackTitle: i18n.t('back'),
                    headerBackVisible: true,
                    headerShadowVisible: false,
                    presentation: 'modal',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }} hitSlop={5}>
                            <IconSymbol name="chevron.left" size={18} color="#007AFF" />
                            <StyledText style={{ color: '#007AFF', fontSize: 18, marginLeft: 5 }}>{i18n.t('back')}</StyledText>
                        </TouchableOpacity>
                    ),
                }}
            />
        </Stack>
    );
}