import { Button, TouchableOpacity, useColorScheme } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'
import { IconSymbol } from './ui/IconSymbol'
import { Colors } from '@/constants/Colors';
import { useContext } from 'react';
import { HymnalContext } from '@/constants/context';
import { SortMode } from '@/constants/types';
import { router } from 'expo-router';

interface HymnalMoreMenuProps {
    bookId: string;
}

export function HymnalMoreMenu({ bookId }: HymnalMoreMenuProps) {
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
                        await context?.deleteHymnal?.(bookId);
                        // navigate back
                        router.back();
                    }}>
                    <DropdownMenu.ItemTitle>Remove Hymnal</DropdownMenu.ItemTitle>
                    <DropdownMenu.ItemIcon ios={{ name: 'trash'}}>
                        <IconSymbol name='trash' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                    </DropdownMenu.ItemIcon>
                </DropdownMenu.Item>
            </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    )
  }