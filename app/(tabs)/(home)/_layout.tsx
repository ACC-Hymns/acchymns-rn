import { HeaderButton } from "@/components/HeaderButton";
import { HymnalMoreMenu } from "@/components/HymnalMoreMenu";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { Pressable, TouchableOpacity, useColorScheme } from "react-native";

export default function HomeLayout() {
    const theme = useColorScheme() ?? 'light';

    return (
        <Stack screenOptions={{ headerShown: false, headerTitleAlign: 'center' }}
            initialRouteName="index">
            <Stack.Screen
                name="index"
                options={{ title: 'Home' }}
            />
            <Stack.Screen
                name="selection/[id]"
                options={{
                    title: 'Selection',
                    headerShown: true,
                    headerTitleAlign: 'center',
                    headerBackVisible: false,
                    headerShadowVisible: false,
                    headerStyle: {
                        backgroundColor: Colors[theme].background,
                    }
                }}
            />
        </Stack>
    );
}