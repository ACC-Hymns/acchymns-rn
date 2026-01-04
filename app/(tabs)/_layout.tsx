import { NativeTabs, Icon, Label, VectorIcon, Badge } from 'expo-router/unstable-native-tabs';
import React, { useContext } from 'react';
import { HymnalContext } from '@/constants/context';
import { useI18n } from '@/hooks/useI18n';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {

    const context = useContext(HymnalContext);
    const theme = useColorScheme() ?? 'light';

    const i18n = useI18n();

    return (
        <NativeTabs indicatorColor={Colors[theme].primaryFaded} labelVisibilityMode='labeled' disableTransparentOnScrollEdge={true} backgroundColor={Colors[theme].settingsButton} iconColor={Colors[theme].tabIconDefault} labelStyle={{ color: Colors[theme].tabIconDefault }} badgeBackgroundColor={Colors[theme].primary}>
            <NativeTabs.Trigger name="(home)">
                <Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('home')}</Label>
                <Icon src={{ default: <VectorIcon family={Ionicons} name='home-outline' />, selected: <VectorIcon family={Ionicons} name='home' /> }} selectedColor={Colors[theme].tabIconSelected} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="search">
                <Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('search')}</Label>
                <Icon src={{ default: <VectorIcon family={Ionicons} name='search-outline' />, selected: <VectorIcon family={Ionicons} name='search' /> }} selectedColor={Colors[theme].tabIconSelected} />
            </NativeTabs.Trigger>
            {!context?.discoverPageVisited ? (
                <NativeTabs.Trigger name="discover">
                    <Badge>New</Badge>
                    <Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('discover')}</Label>
                    <Icon src={{ default: <VectorIcon family={Ionicons} name='telescope-outline' />, selected: <VectorIcon family={Ionicons} name='telescope' /> }} selectedColor={Colors[theme].tabIconSelected} />

                    </NativeTabs.Trigger>) : (
                <NativeTabs.Trigger name="discover">
                    <Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('discover')}</Label>
                    <Icon src={{ default: <VectorIcon family={Ionicons} name='telescope-outline' />, selected: <VectorIcon family={Ionicons} name='telescope' /> }} selectedColor={Colors[theme].tabIconSelected} />
                </NativeTabs.Trigger>)}
            <NativeTabs.Trigger name="bookmarks">
                <Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('bookmarks')}</Label>
                <Icon src={{ default: <VectorIcon family={Ionicons} name='bookmark-outline' />, selected: <VectorIcon family={Ionicons} name='bookmark' /> }} selectedColor={Colors[theme].tabIconSelected} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(settings)">
                <Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('settings')}</Label>
                <Icon src={{ default: <VectorIcon family={Ionicons} name='settings-outline' />, selected: <VectorIcon family={Ionicons} name='settings' /> }} selectedColor={Colors[theme].tabIconSelected} />
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
