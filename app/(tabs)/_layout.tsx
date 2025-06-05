import { Tabs } from 'expo-router';
import React, { useContext } from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { HymnalContext } from '@/constants/context';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';

export default function TabLayout() {
    const colorScheme = useColorScheme();

    const context = useContext(HymnalContext);

    const translations = {
        en: {
            home: 'Home',
            search: 'Search',
            bookmarks: 'Bookmarks',
            settings: 'Settings',
        },
        es: {
            home: 'Inicio',
            search: 'Buscar',
            bookmarks: 'Marcadores',
            settings: 'Configuración',
        },
        fr: {
            home: 'Accueil',
            search: 'Rechercher',
            bookmarks: 'Marque-pages',
            settings: 'Paramètres',
        },
        de: {
            home: 'Startseite',
            search: 'Suchen',
            bookmarks: 'Lesezeichen',
            settings: 'Einstellungen',
        },
        pt: {
            home: 'Início',
            search: 'Pesquisar',
            bookmarks: 'Favoritos',
            settings: 'Configurações',
        },
        sr: {
            home: 'Početna',
            search: 'Pretraga',
            bookmarks: 'Omiljeni',
            settings: 'Podešavanja',
        },
        ja: {
            home: 'ホーム',
            search: '検索',
            bookmarks: 'ブックマーク',
            settings: '設定',
        }
    }

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                headerShown: false,
                headerTitleAlign: 'center',
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
                    title: i18n.t('home'),
                    tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "home" : 'home-outline'} color={color} />,
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: i18n.t('search'),
                    tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "search" : 'search-outline'} color={color} />,
                }}
            />
            <Tabs.Screen
                name="bookmarks"
                options={{
                    title: i18n.t('bookmarks'),
                    tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "bookmarks" : 'bookmarks-outline'} color={color} />,
                }}
            />
            <Tabs.Screen
                name="(settings)"
                options={{
                    title: i18n.t('settings'),
                    tabBarIcon: ({ color, focused }) => <Ionicons size={26} name={focused ? "settings" : 'settings-outline'} color={color} />,
                }}
            />
        </Tabs>
    );
}
