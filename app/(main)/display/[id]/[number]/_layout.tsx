import { Colors } from "@/constants/Colors";
import { router, Stack } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useI18n } from "@/hooks/useI18n";
import { IconSymbol } from "@/components/ui/IconSymbol.ios";
import { useColorScheme } from "@/hooks/useColorScheme";
import { isIOS26DesignEnabled } from "@/constants/iosDesign";

export default function DisplayLayout() {
    const theme = useColorScheme();
    const i18n = useI18n();

    const isLiquidGlass = isIOS26DesignEnabled();
    return (
            <Stack
                screenOptions={{
                    headerShown: false,
                    headerTitleAlign: 'center',
                    contentStyle: { backgroundColor: Colors[theme ?? 'light'].background },
                }}
            >
                <Stack.Screen
                    name="index"
                    options={{
                        title: 'number',
                        headerShown: true,
                        headerTransparent: isLiquidGlass,
                        headerTitleAlign: 'center',
                        headerBackVisible: false,
                        animation: 'none',
                        headerTintColor: Colors[theme ?? 'light'].tint,
                        headerStyle: isLiquidGlass ? undefined : {
                            backgroundColor: Colors[theme ?? 'light'].background,
                        },
                    }}
                />
                <Stack.Screen
                    name="broadcast"
                    options={{
                        title: i18n.t('broadcast'),
                        presentation: isLiquidGlass ? 'formSheet' : 'modal',
                        sheetAllowedDetents: [0.5],
                        sheetInitialDetentIndex: 0,
                        sheetGrabberVisible: false,
                        sheetCornerRadius: 54,
                        contentStyle: { backgroundColor: "transparent" },
                        headerShown: !isLiquidGlass,
                        headerTitleStyle: {
                            color: Colors[theme ?? 'light'].text,
                        },
                        headerTitle: i18n.t('broadcast'),
                        headerTitleAlign: 'center',
                        headerShadowVisible: false,
                        headerStyle: {
                            backgroundColor: Colors[theme ?? 'light'].background,
                        },

                        headerLeft: () => (
                            <TouchableOpacity hitSlop={10} onPress={() => router.back()} style={{ padding: 10 }}>
                                <IconSymbol
                                    name="chevron.left"
                                    size={24}
                                    weight="medium"
                                    color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                                />
                            </TouchableOpacity>
                        )
                    }}
                />
            </Stack>
    );
}
