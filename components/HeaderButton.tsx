import { StyleProp, ViewStyle, PressableStateCallbackType, Pressable } from "react-native";

export const HeaderButton = (
    {
        onPress,
        style,
        children,
    }: {
        onPress?: () => void;
        style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
        children: React.ReactNode;
    }
) => {
    return (
        <Pressable onPress={onPress} style={Object.assign({}, {
                alignContent: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                alignItems: 'center',
                minWidth: 36,
                minHeight: 36,
                alignSelf: 'center',
            }, style)}>
            {children}
        </Pressable>
    );
}