import ScripturePickerBackButton from '@/components/scripturePicker/ScripturePickerBackButton';
import { Colors } from '@/constants/Colors';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ScripturePickerLayout() {
    const theme = useColorScheme() ?? 'light';

    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerTitleAlign: 'center',
                headerBackButtonDisplayMode: 'minimal',
                headerBackVisible: false,
                headerLeft: () => <ScripturePickerBackButton />,
                headerTransparent: false,
                headerShadowVisible: false,
                headerStyle: { backgroundColor: Colors[theme].background },
                headerTintColor: Colors[theme].tint,
                contentStyle: { backgroundColor: Colors[theme].background },
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
            }}
        >
            <Stack.Screen
                name="index"
                options={{ title: 'Select Book' }}
            />
            <Stack.Screen name="[book]/index" />
            <Stack.Screen name="[book]/[chapter]" />
        </Stack>
    );
}
