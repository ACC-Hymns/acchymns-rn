import { Alert, useColorScheme } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'
import { IconSymbol } from './ui/IconSymbol'
import { Colors } from '@/constants/Colors';
import React, { useContext } from 'react';
import { HymnalContext } from '@/constants/context';
import { BookSummary, SortMode } from '@/constants/types';
import { router } from 'expo-router';
import { HeaderButton } from './HeaderButton';
import { useI18n } from '@/hooks/useI18n';

interface HymnalMoreMenuProps {
    bookSummary: BookSummary;
}

export function HymnalMoreMenu({ bookSummary }: HymnalMoreMenuProps) {
    const theme = useColorScheme() ?? 'light';
    const context = useContext(HymnalContext);
    const i18n = useI18n();

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <HeaderButton onPress={() => {}}>
                    <IconSymbol
                        name="ellipsis.circle"
                        size={24}
                        color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                    />
                </HeaderButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
                <DropdownMenu.Group>
                    <DropdownMenu.Label>{i18n.t('sortingLabel')}</DropdownMenu.Label>
                    <DropdownMenu.Item key="numerical-sort" onSelect={() => { context?.setSortMode?.(SortMode.NUMERICAL) }}>
                        <DropdownMenu.ItemTitle>{i18n.t('numerical')}</DropdownMenu.ItemTitle>
                        <DropdownMenu.ItemIcon ios={{ name: 'textformat.123' }}>
                            <IconSymbol name='textformat.123' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                        </DropdownMenu.ItemIcon>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item key="alphabetical-sort" onSelect={() => { context?.setSortMode?.(SortMode.ALPHABETICAL) }}>
                        <DropdownMenu.ItemTitle>{i18n.t('alphabetical')}</DropdownMenu.ItemTitle>
                        <DropdownMenu.ItemIcon ios={{ name: 'textformat.abc' }}>
                            <IconSymbol name='textformat.abc' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                        </DropdownMenu.ItemIcon>
                    </DropdownMenu.Item>
                    {bookSummary.indexAvailable && (
                        <DropdownMenu.Item key="topical-sort" onSelect={() => { context?.setSortMode?.(SortMode.TOPICAL) }}>
                            <DropdownMenu.ItemTitle>{i18n.t('topical')}</DropdownMenu.ItemTitle>
                            <DropdownMenu.ItemIcon ios={{ name: 'book' }}>
                                <IconSymbol name='book' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                            </DropdownMenu.ItemIcon>
                        </DropdownMenu.Item>
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
                            <IconSymbol name='trash' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                        </DropdownMenu.ItemIcon>
                    </DropdownMenu.Item>
                </DropdownMenu.Group>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}