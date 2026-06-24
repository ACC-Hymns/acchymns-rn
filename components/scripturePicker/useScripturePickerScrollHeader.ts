import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

export function useScripturePickerScrollHeader() {
    const navigation = useNavigation();
    const theme = useColorScheme() ?? 'light';
    const backgroundColor = Colors[theme].background;

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTransparent: false,
            headerShadowVisible: false,
            headerStyle: { backgroundColor },
        });
    }, [navigation, backgroundColor]);

    return useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        navigation.setOptions({
            headerShadowVisible: event.nativeEvent.contentOffset.y > 0,
        });
    }, [navigation]);
}
