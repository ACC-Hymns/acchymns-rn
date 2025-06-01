import { Button, TouchableOpacity, useColorScheme } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'
import { IconSymbol } from './ui/IconSymbol'
import { Colors } from '@/constants/Colors';
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HymnalContext } from '@/constants/context';
import { Bookmark, Song, SortMode } from '@/constants/types';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { getSongData } from '@/scripts/hymnals';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DisplayMoreMenuProps {
    bookId: string;
    songId?: string;
}

export function DisplayMoreMenu({ bookId, songId }: DisplayMoreMenuProps) {
    const theme = useColorScheme() ?? 'light';
    const context = useContext(HymnalContext);
    const BOOKMARKS_KEY = 'bookmarks';
    const [existingBookmarks, setExistingBookmarks] = useState<Bookmark[]>([]);
    const [isBookmarked, setIsBookmarked] = useState(false);

    const addBookmark = async (bookmark: Bookmark) => {
        try {
            const bookmarks: Bookmark[] = existingBookmarks ?? [];
            // Check if the bookmark already exists
            const exists = bookmarks.some(b => b.book === bookmark.book && b.number === bookmark.number);
            if (exists) {
                removeBookmark(bookmark);
                return;
            }
            console.log('Adding bookmark for', bookId, songId);
            bookmarks.push(bookmark);
            await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
            setExistingBookmarks(bookmarks); // Update the current bookmarks
            setIsBookmarked(true); // Set the bookmark state to true
        } catch (error) {
            console.error("Error saving bookmarks:", error);
        }
    };

    const removeBookmark = async (bookmark: Bookmark) => {
        console.log('Removing bookmark for', bookmark);
        try {
            const bookmarks: Bookmark[] = existingBookmarks ?? [];
            // Filter out the bookmark to be removed
            const updatedBookmarks = bookmarks.filter(b => !(b.book === bookmark.book && b.number === bookmark.number));
            await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updatedBookmarks));
            setExistingBookmarks(updatedBookmarks); // Update the current bookmarks
            setIsBookmarked(false); // Set the bookmark state to false
        } catch (error) {
            console.error("Error removing bookmark:", error);
        }
    };

    const [songData, setSongData] = useState<Song | null>(null);
    useLayoutEffect(() => {
        if (songId) {
            getSongData(bookId).then((data) => {
                setSongData(data[songId]);
            });
            
            AsyncStorage.getItem(BOOKMARKS_KEY).then((data) => {
                setExistingBookmarks(JSON.parse(data || '[]'));
            });
        }
    }, [bookId, songId]);

    useEffect(() => {
        if (songData && existingBookmarks) {
            const isBookmarked = existingBookmarks.some(b => b.book === bookId && b.number === songId);
            setIsBookmarked(isBookmarked);
        }
    }, [songData, existingBookmarks, bookId, songId]);

    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
            <TouchableOpacity onPress={() => {
                console.log(isBookmarked ? 'Is Bookmarked' : 'Not Bookmarked');
            }}>
                <IconSymbol
                    name="ellipsis.circle"
                    size={24}
                    color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                />
            </TouchableOpacity>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
            <DropdownMenu.Group>
                <DropdownMenu.Item key="bookmark" onSelect={async () => {
                    await addBookmark({
                        book: bookId,
                        number: songId ?? '',
                    })
                }}>
                    <DropdownMenu.ItemTitle>
                        {isBookmarked ? 'Remove Bookmark' : 'Save as Bookmark'}
                    </DropdownMenu.ItemTitle>
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