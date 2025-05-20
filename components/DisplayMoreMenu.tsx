import { Button, TouchableOpacity, useColorScheme } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'
import { IconSymbol } from './ui/IconSymbol'
import { Colors } from '@/constants/Colors';
import { useContext, useEffect, useState } from 'react';
import { HymnalContext } from '@/constants/context';
import { Song, SortMode } from '@/constants/types';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { getSongData } from '@/scripts/hymnals';

interface DisplayMoreMenuProps {
    bookId: string;
    songId?: string;
}

export function DisplayMoreMenu({ bookId, songId }: DisplayMoreMenuProps) {
    const theme = useColorScheme() ?? 'light';
    const context = useContext(HymnalContext);

    const [songData, setSongData] = useState<Song | null>(null);
    useEffect(() => {
        if (songId) {
            getSongData(bookId).then((data) => {
                setSongData(data[songId]);
            });
        }
    }, [bookId, songId]);
  
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
                <DropdownMenu.Item key="bookmark" onSelect={() => {}}>
                    <DropdownMenu.ItemTitle>Bookmark</DropdownMenu.ItemTitle>
                    <DropdownMenu.ItemIcon ios={{ name: 'bookmark'}}>
                        <IconSymbol name='bookmark' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                    </DropdownMenu.ItemIcon>
                </DropdownMenu.Item>
                <DropdownMenu.Item key="share" onSelect={async () => {
                    await Sharing.shareAsync(`https://acchymns.app/display/${bookId}/${songId}`, {
                        dialogTitle: songData?.title
                    })
                }}>
                    <DropdownMenu.ItemTitle>Share</DropdownMenu.ItemTitle>
                    <DropdownMenu.ItemIcon ios={{ name: 'square.and.arrow.up'}}>
                        <IconSymbol name='square.and.arrow.up' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                    </DropdownMenu.ItemIcon>
                </DropdownMenu.Item>
                <DropdownMenu.Item key="report-issue" onSelect={() => {}} destructive={true} >
                    <DropdownMenu.ItemTitle>Report Issue</DropdownMenu.ItemTitle>
                    <DropdownMenu.ItemIcon ios={{ name: 'exclamationmark.bubble'}}>
                        <IconSymbol name='exclamationmark.bubble' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                    </DropdownMenu.ItemIcon>
                </DropdownMenu.Item>
            </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    )
  }