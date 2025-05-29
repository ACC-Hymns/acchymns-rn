import { Alert, Button, TouchableOpacity, useColorScheme } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'
import { IconSymbol } from './ui/IconSymbol'
import { Colors } from '@/constants/Colors';
import { useContext } from 'react';
import { HymnalContext } from '@/constants/context';
import { BookSummary, SortMode } from '@/constants/types';
import { router } from 'expo-router';

interface HymnalMoreMenuProps {
    bookSummary: BookSummary;
}

export function HymnalMoreMenu({ bookSummary }: HymnalMoreMenuProps) {
  const theme = useColorScheme() ?? 'light';
  const context = useContext(HymnalContext);
  
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
            <TouchableOpacity onPress={() => {}}>
                <IconSymbol
                    name="ellipsis.circle"
                    size={24}
                    color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                />
            </TouchableOpacity>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
            <DropdownMenu.Group>
                <DropdownMenu.Label>Sorting Options</DropdownMenu.Label>
                <DropdownMenu.Item key="numerical-sort" onSelect={() => {context?.setSortMode?.(SortMode.NUMERICAL)}}>
                    <DropdownMenu.ItemTitle>Numerical</DropdownMenu.ItemTitle>
                    <DropdownMenu.ItemIcon ios={{ name: 'textformat.123'}}>
                        <IconSymbol name='textformat.123' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                    </DropdownMenu.ItemIcon>
                </DropdownMenu.Item>
                <DropdownMenu.Item key="alphabetical-sort" onSelect={() => {context?.setSortMode?.(SortMode.ALPHABETICAL)}}>
                    <DropdownMenu.ItemTitle>Alphabetical</DropdownMenu.ItemTitle>
                    <DropdownMenu.ItemIcon ios={{ name: 'textformat.abc'}}>
                        <IconSymbol name='textformat.abc' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                    </DropdownMenu.ItemIcon>
                </DropdownMenu.Item>
                <DropdownMenu.Item key="topical-sort" onSelect={() => {context?.setSortMode?.(SortMode.TOPICAL)}}>
                    <DropdownMenu.ItemTitle>Topical</DropdownMenu.ItemTitle>
                    <DropdownMenu.ItemIcon ios={{ name: 'book'}}>
                        <IconSymbol name='book' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                    </DropdownMenu.ItemIcon>
                </DropdownMenu.Item>
            </DropdownMenu.Group>
            
            <DropdownMenu.Group>
                <DropdownMenu.Item key="delete-action" destructive={true} onSelect={async () => {
                        Alert.alert(`Delete "${bookSummary.name.medium}"`, 'You can always download the hymnal again later.', [
                            {
                                text: 'Cancel',
                                onPress: () => {
                                    
                                },
                                style: 'cancel',
                                isPreferred: true
                            },
                            {
                                text: 'Delete',
                                onPress: async () => {
                                    // navigate back
                                    router.back();
                                    await context?.deleteHymnal?.(bookSummary.name.short);
                                },
                                style: 'destructive'
                            },
                        ]);
                    }}>
                    <DropdownMenu.ItemTitle>Delete Hymnal</DropdownMenu.ItemTitle>
                    <DropdownMenu.ItemIcon ios={{ name: 'trash'}}>
                        <IconSymbol name='trash' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                    </DropdownMenu.ItemIcon>
                </DropdownMenu.Item>
            </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    )
  }