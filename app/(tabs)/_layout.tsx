import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import React, { useContext } from 'react';
import { HymnalContext } from '@/constants/context';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { translations } from '@/constants/localization';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {

    const context = useContext(HymnalContext);
    const theme = useColorScheme() ?? 'light';

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    return (
        <NativeTabs disableTransparentOnScrollEdge={true} backgroundColor={Colors[theme].settingsButton} iconColor={Colors[theme].tabIconDefault} labelStyle={{color: Colors[theme].tabIconDefault}}>
            <NativeTabs.Trigger name="(home)">
                <Label selectedStyle={{color: Colors[theme].text}}>{i18n.t('home')}</Label>
                <Icon src={{ default: <VectorIcon family={Ionicons} name='home-outline'/>, selected: <VectorIcon family={Ionicons} name='home'/> }} selectedColor={Colors[theme].tabIconSelected}/>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="search">
                <Label selectedStyle={{color: Colors[theme].text}}>{i18n.t('search')}</Label>
                <Icon src={{ default: <VectorIcon family={Ionicons} name='search-outline'/>, selected: <VectorIcon family={Ionicons} name='search'/> }} selectedColor={Colors[theme].tabIconSelected}/>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="discover">
                <Label selectedStyle={{color: Colors[theme].text}}>{i18n.t('discover')}</Label>
                <Icon src={{ default: <VectorIcon family={Ionicons} name='telescope-outline'/>, selected: <VectorIcon family={Ionicons} name='telescope'/> }} selectedColor={Colors[theme].tabIconSelected}/>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="bookmarks">
                <Label selectedStyle={{color: Colors[theme].text}}>{i18n.t('bookmarks')}</Label>
                <Icon src={{ default: <VectorIcon family={Ionicons} name='bookmark-outline'/>, selected: <VectorIcon family={Ionicons} name='bookmark'/> }} selectedColor={Colors[theme].tabIconSelected}/>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(settings)">
                <Label selectedStyle={{color: Colors[theme].text}}>{i18n.t('settings')}</Label>
                <Icon src={{ default: <VectorIcon family={Ionicons} name='settings-outline'/>, selected: <VectorIcon family={Ionicons} name='settings'/> }} selectedColor={Colors[theme].tabIconSelected}/>
            </NativeTabs.Trigger>
        </NativeTabs>
        // <Tabs
        //     screenOptions={{
        //         tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        //         headerShown: false,
        //         headerTitleAlign: 'center',
        //         tabBarButton: HapticTab,
        //         tabBarBackground: TabBarBackground,
        //         tabBarStyle: Platform.select({
        //             ios: {
        //                 // Use a transparent background on iOS to show the blur effect
        //                 position: 'absolute',
        //                 height: 85, // Increase the height of the tab bar
        //             },
        //             default: {
        //                 height: 55, // Increase the height of the tab bar
        //             },
        //         }),
        //     }}>
        //     <Tabs.Screen
        //         name="(home)"
        //         options={{
        //             title: i18n.t('home'),
        //             tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "home" : 'home-outline'} color={color} />,
        //         }}
        //     />
        //     <Tabs.Screen
        //         name="search"
        //         options={{
        //             title: i18n.t('search'),
        //             tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "search" : 'search-outline'} color={color} />,
        //         }}
        //     />
        //     <Tabs.Screen
        //         name="discover"
        //         options={context?.discoverPageVisited ? {
        //             title: i18n.t('discover'),
        //             tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "telescope" : 'telescope-outline'} color={color} />,
        //             tabBarBadgeStyle: {
        //                 backgroundColor: Colors['light']['primary'], maxWidth: 10,
        //                 maxHeight: 10,
        //                 fontSize: 8,
        //                 lineHeight: 9,
        //                 alignSelf: undefined,
        //             },
        //         } : {
        //             title: i18n.t('discover'),
        //             tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "telescope" : 'telescope-outline'} color={color} />,
        //             tabBarBadge: "",
        //             tabBarBadgeStyle: {
        //                 backgroundColor: Colors['light']['primary'], maxWidth: 10,
        //                 maxHeight: 10,
        //                 fontSize: 8,
        //                 lineHeight: 9,
        //                 alignSelf: undefined,
        //             },
        //         }}
        //     />
        //     <Tabs.Screen
        //         name="bookmarks"
        //         options={{
        //             title: i18n.t('bookmarks'),
        //             tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "bookmarks" : 'bookmarks-outline'} color={color} />,
        //         }}
        //     />
        //     <Tabs.Screen
        //         name="(settings)"
        //         options={{
        //             title: i18n.t('settings'),
        //             tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "settings" : 'settings-outline'} color={color} />,
        //         }}
        //     />
        // </Tabs>
    );
}
