import { HymnalMoreMenu } from "@/components/HymnalMoreMenu";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { I18n } from "i18n-js";
import { Ionicons } from "@expo/vector-icons";
import { getLocales } from "expo-localization";
import { router, Stack } from "expo-router";
import { Text, TouchableOpacity, useColorScheme } from "react-native";
import { useContext } from "react";
import { HymnalContext } from "@/constants/context";
import { translations } from "@/constants/localization";
import StyledText from '@/components/StyledText';

export default function DisplayLayout() {
    const theme = useColorScheme() ?? 'light';
    const context = useContext(HymnalContext);
    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    return (
        <Stack screenOptions={{ headerShown: false, headerTitleAlign: 'center' }}>
            <Stack.Screen
                name="index"
                options={{
                    title: 'number',
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: Colors[theme].headerBackground,
                    },
                    headerTitleAlign: 'center',
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
                    animation: 'none'
                }}
            />
            <Stack.Screen
                name="details"
                options={{
                    title: i18n.t('details'),
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