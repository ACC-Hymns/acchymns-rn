import { InteractionManager, Platform, TouchableOpacity } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'
import { IconSymbol } from './ui/IconSymbol'
import { Colors } from '@/constants/Colors';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Bookmark, Song } from '@/constants/types';
import * as Sharing from 'expo-sharing';
import { getSongData } from '@/scripts/hymnals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '@/hooks/useI18n';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as SwiftUI from '@expo/ui/swift-ui';
import { RNHostView } from '@expo/ui/swift-ui';

interface DisplayMoreMenuProps {
    bookId: string;
    songId?: string;
    onReportIssuePress?: () => void;
}

export function DisplayMoreMenu({ bookId, songId, onReportIssuePress }: DisplayMoreMenuProps) {
    const theme = useColorScheme() ?? 'light';
    const BOOKMARKS_KEY = 'bookmarks';
    const [existingBookmarks, setExistingBookmarks] = useState<Bookmark[]>([]);
    const [isBookmarked, setIsBookmarked] = useState(false);
    /**
     * iOS (react-native-ios-context-menu / Zeego): the bookmark row calls setState inside onSelect,
     * so the native menu is rebuilt and does not keep a bogus "selected" checkmark. Share and
     * report do not otherwise update this component — bump this key after those actions so the
     * menu remounts like a bookmark tap would.
     */
    const [nativeMenuKey, setNativeMenuKey] = useState(0);
    const [menuInstanceId, setMenuInstanceId] = useState(0);
    const reportOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const i18n = useI18n();

    const addBookmark = async (bookmark: Bookmark) => {
        try {
            const bookmarks: Bookmark[] = existingBookmarks ?? [];
            // Check if the bookmark already exists
            const exists = bookmarks.some(b => b.book === bookmark.book && b.number === bookmark.number);
            if (exists) {
                removeBookmark(bookmark);
                return;
            }
            bookmarks.push(bookmark);
            await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
            setExistingBookmarks(bookmarks); // Update the current bookmarks
            setIsBookmarked(true); // Set the bookmark state to true
        } catch (error) {
            console.error("Error saving bookmarks:", error);
        }
    };

    const removeBookmark = async (bookmark: Bookmark) => {
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



    const clearPendingReportOpen = useCallback(() => {
        if (reportOpenTimeoutRef.current) {
            clearTimeout(reportOpenTimeoutRef.current);
            reportOpenTimeoutRef.current = null;
        }
    }, []);

    const broadcast = async () => {

    }

    const [songData, setSongData] = useState<Song | null>(null);
    useLayoutEffect(() => {
        if (songId) {
            getSongData(bookId).then((data) => {
                if(!data)
                    return;
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

    const openReportIssueAfterMenuCloses = useCallback(() => {
        InteractionManager.runAfterInteractions(() => {
            clearPendingReportOpen();
            setNativeMenuKey((k) => k + 1);
            // Native menus must finish closing or the next Modal won't receive touches.
            const delay = Platform.OS === 'ios' ? 350 : 120;
            reportOpenTimeoutRef.current = setTimeout(() => {
                reportOpenTimeoutRef.current = null;
                onReportIssuePress?.();
            }, delay);
        });
    }, [clearPendingReportOpen, onReportIssuePress]);

    useEffect(() => {
        return () => {
            clearPendingReportOpen();
        };
    }, [clearPendingReportOpen]);

    return (
        <>
            {Platform.OS === 'ios' ? (
                <SwiftUI.Host key={nativeMenuKey} matchContents>
                    <SwiftUI.Menu
                        label={
                            <RNHostView matchContents>
                                <IconSymbol
                                    name="ellipsis.circle"
                                    size={24}
                                    color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                                />
                            </RNHostView>
                        }
                    >
                        <SwiftUI.Button
                            label={isBookmarked ? i18n.t('removeBookmark') : i18n.t('saveBookmark')}
                            systemImage="bookmark"
                            onPress={async () => {
                                await addBookmark({
                                    book: bookId,
                                    number: songId ?? '',
                                });
                            }}
                        />
                        <SwiftUI.Button
                            label="Share"
                            systemImage="square.and.arrow.up"
                            onPress={async () => {
                                await Sharing.shareAsync(`https://acchymns.app/display/${bookId}/${songId}`, {
                                    dialogTitle: songData?.title
                                });
                            }}
                        />
                        <SwiftUI.Button
                            label={i18n.t('reportIssue')}
                            systemImage="exclamationmark.bubble"
                            role="destructive"
                            onPress={openReportIssueAfterMenuCloses}
                        />
                    </SwiftUI.Menu>
                </SwiftUI.Host>
            ) : (
                <DropdownMenu.Root
                    key={nativeMenuKey}
                    onOpenChange={(isOpen) => {
                        if (isOpen) {
                            setMenuInstanceId((id) => id + 1);
                        }
                    }}
                >
                    <DropdownMenu.Trigger>
                    <TouchableOpacity onPress={() => { }} hitSlop={10}>
                            <IconSymbol
                                name="ellipsis.circle"
                                size={24}
                                color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                            />
                        </TouchableOpacity>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                        <DropdownMenu.Item key={`bookmark-${menuInstanceId}`} onSelect={async () => {
                            await addBookmark({
                                book: bookId,
                                number: songId ?? '',
                            })
                        }}>
                            <DropdownMenu.ItemTitle>
                                {isBookmarked ? i18n.t('removeBookmark') : i18n.t('saveBookmark')}
                            </DropdownMenu.ItemTitle>
                            <DropdownMenu.ItemIcon ios={{ name: 'bookmark' }}>
                                <IconSymbol name='bookmark' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                            </DropdownMenu.ItemIcon>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item key={`share-${menuInstanceId}`} onSelect={async () => {
                            try {
                                await Sharing.shareAsync(`https://acchymns.app/display/${bookId}/${songId}`, {
                                    dialogTitle: songData?.title
                                });
                            } finally {
                                InteractionManager.runAfterInteractions(() => {
                                    setNativeMenuKey((k) => k + 1);
                                });
                            }
                        }}>
                            <DropdownMenu.ItemTitle>{i18n.t('share')}</DropdownMenu.ItemTitle>
                            <DropdownMenu.ItemIcon ios={{ name: 'square.and.arrow.up' }}>
                                <IconSymbol name='square.and.arrow.up' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                            </DropdownMenu.ItemIcon>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item key={`report-issue-${menuInstanceId}`} onSelect={openReportIssueAfterMenuCloses} destructive={true} >
                            <DropdownMenu.ItemTitle>{i18n.t('reportIssue')}</DropdownMenu.ItemTitle>
                            <DropdownMenu.ItemIcon ios={{ name: 'exclamationmark.bubble' }}>
                                <IconSymbol name='exclamationmark.bubble' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                            </DropdownMenu.ItemIcon>
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            )}
        </>
    )
}