import { HymnalMoreMenu } from "@/components/HymnalMoreMenu";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { Pressable, TouchableOpacity, useColorScheme } from "react-native";

export default function HomeLayout() {
  const theme = useColorScheme() ?? 'light';

    return (
        <Stack screenOptions={{ headerShown: false }}
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
                headerRight: () => (
                  <HymnalMoreMenu />
                ),
            }} 
            />
        </Stack>
    );
}