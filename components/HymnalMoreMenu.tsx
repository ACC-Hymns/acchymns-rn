import { Button, TouchableOpacity, useColorScheme } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'
import { IconSymbol } from './ui/IconSymbol'
import { Colors } from '@/constants/Colors';

export function HymnalMoreMenu() {
  const theme = useColorScheme() ?? 'light';
  
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
                <DropdownMenu.Item key="numerical-sort">
                    <DropdownMenu.ItemTitle>Numerical</DropdownMenu.ItemTitle>
                    <DropdownMenu.ItemIcon ios={{ name: 'textformat.123'}}>
                        <IconSymbol name='textformat.123' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                    </DropdownMenu.ItemIcon>
                </DropdownMenu.Item>
                <DropdownMenu.Item key="alphabetical-sort">
                    <DropdownMenu.ItemTitle>Alphabetical</DropdownMenu.ItemTitle>
                    <DropdownMenu.ItemIcon ios={{ name: 'textformat.abc'}}>
                        <IconSymbol name='textformat.abc' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                    </DropdownMenu.ItemIcon>
                </DropdownMenu.Item>
                <DropdownMenu.Item key="topical-sort">
                    <DropdownMenu.ItemTitle>Topical</DropdownMenu.ItemTitle>
                    <DropdownMenu.ItemIcon ios={{ name: 'book'}}>
                        <IconSymbol name='book' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                    </DropdownMenu.ItemIcon>
                </DropdownMenu.Item>
            </DropdownMenu.Group>
            
            <DropdownMenu.Group>
                <DropdownMenu.Item key="share-action">
                    <DropdownMenu.ItemTitle>Share</DropdownMenu.ItemTitle>
                    <DropdownMenu.ItemIcon ios={{ name: 'square.and.arrow.up'}}>
                        <IconSymbol name='square.and.arrow.up' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                    </DropdownMenu.ItemIcon>
                </DropdownMenu.Item>
            </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    )
  }