import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Stack } from "expo-router";

export const unstable_settings = {
    anchor: 'index',
};

export default function HomeLayout() {
    const theme = useColorScheme();

    return (
        <Stack screenOptions={{ headerShown: false, headerTitleAlign: 'center' }}>
            <Stack.Screen
                name="index"
                options={{ title: 'Home' }}
            />
            <Stack.Screen
                name="selection/[id]"
                options={({ route }) => ({
                    title: 'Selection',
                    headerShown: true,
                    headerTitleAlign: 'center',
                    headerBackVisible: false,
                    headerShadowVisible: false,
                    animation: (route.params as { ghost?: string } | undefined)?.ghost === '1'
                        ? 'none'
                        : 'default',
                    headerStyle: {
                        backgroundColor: Colors[theme ?? 'light'].background,
                    },
                    headerTintColor: Colors[theme ?? 'light'].tint,
                })}
            />
        </Stack>
    );
}
