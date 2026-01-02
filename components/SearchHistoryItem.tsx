// default component
import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, useColorScheme, StyleSheet, PanResponder, Pressable, Animated } from 'react-native';
import { IconSymbol } from './ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import StyledText from './StyledText';
import { Ionicons } from '@expo/vector-icons';


interface SearchHistoryItemProps {
    item: string;
    onPress: () => void;
    onGestureStart: () => void;
    onGestureEnd: () => void;
    onDelete: () => void;
    isLastItem?: boolean;
}

type HapticEvent = {
    position: number;
    time: number;
}

export function SearchHistoryItem({ item, onPress, onGestureStart, onGestureEnd, onDelete, isLastItem }: SearchHistoryItemProps) {
    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);
    const translateX = useRef(new Animated.Value(0)).current;
    const isInDeleteRange = useRef(false);
    const hapticTriggered = useRef(false);

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dx < 0) {
                translateX.setValue(gestureState.dx);
                onGestureStart();


                // check if the gesture is in the delete range
                isInDeleteRange.current = gestureState.dx < -200;

                // trigger haptic feedback ONCE whenever the boolean above changes
                if (isInDeleteRange.current && !hapticTriggered.current) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    hapticTriggered.current = true;
                } else if (!isInDeleteRange.current) {
                    hapticTriggered.current = false;
                }
                
                
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dx < -50) {
                Animated.timing(translateX, {
                    toValue: -100,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            } else {
                Animated.timing(translateX, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            }

            if (isInDeleteRange.current) {
                onDelete();
                translateX.setValue(0);
            }

            onGestureEnd();
        },
        onPanResponderTerminate: () => {
            Animated.timing(translateX, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
            onGestureEnd();
        },
    });

    return (
        <View
            style={{
                borderBottomWidth: isLastItem ? 0 : 0.5,
                borderBottomColor: Colors[theme]['border']}}>
                <Animated.View
                    style={{
                        flex: 1,
                        transform: [{ translateX: translateX }],
                    }}
                    {...panResponder.panHandlers}
                >
                    <Pressable
                        style={styles.searchHistoryItem}
                        onPress={() => {
                            onPress();
                        }}
                    >
                        <IconSymbol
                            name="magnifyingglass"
                            size={24}
                            color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                        />
                        <StyledText style={styles.searchHistoryText}>{item}</StyledText>
                    </Pressable>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                            translateX.setValue(0);
                            onDelete();
                        }}
                    >
                        <Ionicons
                            name="trash-outline"
                            size={24}
                            color="white"
                        />
                    </TouchableOpacity>
                </Animated.View>
        </View>
    );
}

function makeStyles(theme: 'light' | 'dark') {
    return StyleSheet.create({
        searchHistoryItem: {
            padding: 6,
            borderRadius: 16,
            backgroundColor: Colors[theme]['background'],
            borderColor: Colors[theme]['text'],
            marginVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 16,
        },
        searchHistoryText: {
            color: Colors[theme]['text'],
            fontSize: 18,
            fontWeight: 'light',
            textAlign: 'left',
            flex: 1,
        },
        deleteButton: {
          width: 380,
          height: "100%",
          backgroundColor: Colors[theme]['destructive'],
          justifyContent: "center",
          alignItems: 'flex-start',
          padding: 28,
          position: "absolute",
          right: -400,
        },
        deleteButtonText: {
          color: "white",
          fontWeight: "bold",
        },
    });
}