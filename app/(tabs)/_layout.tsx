import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
    const colorScheme = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                headerShown: false,
                tabBarButton: HapticTab,
                tabBarBackground: TabBarBackground,
                tabBarStyle: Platform.select({
                    ios: {
                        // Use a transparent background on iOS to show the blur effect
                        position: 'absolute',
                        height: 85, // Increase the height of the tab bar
                    },
                    default: {
                        height: 55, // Increase the height of the tab bar
                    },
                }),
            }}>
            <Tabs.Screen
                name="(home)"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused }) => <IconSymbol size={28} name={focused ? "house.fill" : 'house'} color={color} />,
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: 'Search',
                    tabBarIcon: ({ color, focused }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
                }}
            />
            <Tabs.Screen
                name="bookmarks"
                options={{
                    title: 'Bookmarks',
                    tabBarIcon: ({ color, focused }) => <IconSymbol size={28} name={focused ? "bookmark.fill" : 'bookmark'} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, focused }) => <IconSymbol size={28} name="gear" color={color} />,
                }}
            />
        </Tabs>
    );
}
