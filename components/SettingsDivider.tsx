import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type SettingsDividerProps = {
    color: string;
    width?: number;
    style?: StyleProp<ViewStyle>;
};

export function SettingsDivider({
    color,
    width = StyleSheet.hairlineWidth,
    style,
}: SettingsDividerProps) {
    return <View style={[{ height: width, backgroundColor: color }, style]} />;
}
