import { Colors } from '@/constants/Colors';
import { isIOS26DesignDisabled } from '@/constants/iosDesign';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@react-native-vector-icons/ionicons';
import { TouchableOpacity } from 'react-native';

export default function ScripturePickerBackButton() {
    const theme = useColorScheme() ?? 'light';

    return (
        <TouchableOpacity
            hitSlop={10}
            onPress={() => router.back()}
            style={{ paddingHorizontal: 4 }}
        >
            <Ionicons
                name={isIOS26DesignDisabled() ? 'chevron-back' : 'chevron-back-outline'}
                size={24}
                color={Colors[theme].icon}
            />
        </TouchableOpacity>
    );
}
