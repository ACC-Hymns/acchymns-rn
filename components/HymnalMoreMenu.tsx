import { Alert, Platform, useColorScheme } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'
import { Colors } from '@/constants/Colors';
import React, { useContext, useState } from 'react';
import { HymnalContext } from '@/constants/context';
import { BookSummary, SortMode } from '@/constants/types';
import { router } from 'expo-router';
import { HeaderButton } from './HeaderButton';
import { useI18n } from '@/hooks/useI18n';
import * as SwiftUI from '@expo/ui/swift-ui';
import { RNHostView } from '@expo/ui/swift-ui';
import Ionicons from '@react-native-vector-icons/ionicons';

interface HymnalMoreMenuProps {
    bookSummary: BookSummary;
}

export function HymnalMoreMenu({ bookSummary }: HymnalMoreMenuProps) {
    const theme = useColorScheme() ?? 'light';
    const context = useContext(HymnalContext);
    const i18n = useI18n();

    const [sortMode, setSortMode] = useState<SortMode>(SortMode.NUMERICAL);

    const handleSortModeChange = (mode: SortMode) => {
        setSortMode(mode);
        context?.setSortMode?.(mode);
    }

    return (
        <>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <HeaderButton onPress={() => { }}>
                        <Ionicons
                            name="ellipsis-horizontal"
                            size={24}
                            color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                        />
                    </HeaderButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    <DropdownMenu.Group>
                        <DropdownMenu.Label>{i18n.t('sortingLabel')}</DropdownMenu.Label>
                        <DropdownMenu.CheckboxItem key="numerical-sort" value={sortMode === SortMode.NUMERICAL} onSelect={() => { handleSortModeChange(SortMode.NUMERICAL) }}>
                            <DropdownMenu.ItemTitle>{i18n.t('numerical')}</DropdownMenu.ItemTitle>
                        </DropdownMenu.CheckboxItem>
                        <DropdownMenu.CheckboxItem key="alphabetical-sort" value={sortMode === SortMode.ALPHABETICAL} onSelect={() => { handleSortModeChange(SortMode.ALPHABETICAL) }}>
                            <DropdownMenu.ItemTitle>{i18n.t('alphabetical')}</DropdownMenu.ItemTitle>
                        </DropdownMenu.CheckboxItem>
                        {bookSummary.indexAvailable && (
                            <DropdownMenu.CheckboxItem key="topical-sort" value={sortMode === SortMode.TOPICAL} onSelect={() => { handleSortModeChange(SortMode.TOPICAL) }}>
                                <DropdownMenu.ItemTitle>{i18n.t('topical')}</DropdownMenu.ItemTitle>
                            </DropdownMenu.CheckboxItem>
                        )}
                    </DropdownMenu.Group>

                    <DropdownMenu.Group>
                        <DropdownMenu.Item key="delete-action" destructive={true} onSelect={async () => {
                            Alert.alert(`${i18n.t('deleteAlertTitle')}"${bookSummary.name.medium}"`, i18n.t('deleteAlertMessage'), [
                                {
                                    text: i18n.t('cancel'),
                                    onPress: () => {

                                    },
                                    style: 'cancel',
                                    isPreferred: true
                                },
                                {
                                    text: i18n.t('remove'),
                                    onPress: async () => {
                                        // navigate back
                                        router.back();
                                        await context?.deleteHymnal?.(bookSummary.name.short);
                                    },
                                    style: 'destructive'
                                },
                            ]);
                        }}>
                            <DropdownMenu.ItemTitle>{i18n.t('deleteHymnal')}</DropdownMenu.ItemTitle>
                            <DropdownMenu.ItemIcon ios={{ name: 'trash' }}>
                                <Ionicons name='trash-outline' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                            </DropdownMenu.ItemIcon>
                        </DropdownMenu.Item>
                    </DropdownMenu.Group>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </>
    )
}