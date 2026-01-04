import { HymnalMoreMenu } from "@/components/HymnalMoreMenu";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { Platform, Text, TouchableOpacity, useColorScheme } from "react-native";
import { useContext, useLayoutEffect, useState } from "react";
import { HymnalContext } from "@/constants/context";
import { useI18n } from "@/hooks/useI18n";
import StyledText from '@/components/StyledText';

export default function DisplayLayout() {
    const theme = useColorScheme() ?? 'light';
    const context = useContext(HymnalContext);
    const i18n = useI18n();

    let isLiquidGlass = false;
    if (Platform.OS === 'ios') {
        const majorVersion = parseInt(Platform.Version, 10);
        if (majorVersion >= 26) {
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
                    animation: 'none',
                    headerTintColor: Colors[theme].tint,
                    headerStyle: isLiquidGlass ? undefined : {
                        backgroundColor: Colors[theme].background,
                    },
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
                    headerTintColor: Colors[theme].tint,

                    headerStyle: {
                        backgroundColor: Colors[theme].background,
                    },
                }}
            />
        </Stack>
    );
}