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
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';

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

    const translations = {
        en: {
            details: 'Details',
            removeBookmark: 'Remove Bookmark',
            saveBookmark: 'Save as Bookmark',
            share: 'Share',
            reportIssue: 'Report Issue',
        },
        es: {
            details: 'Detalles',
            removeBookmark: 'Eliminar Marcador',
            saveBookmark: 'Guardar como Marcador',
            share: 'Compartir',
            reportIssue: 'Reportar Problema',
        },
        fr: {
            details: 'Détails',
            removeBookmark: 'Supprimer le Marque-page',
            saveBookmark: 'Enregistrer comme Marque-page',
            share: 'Partager',
            reportIssue: 'Signaler un Problème',
        },
        de: {
            details: 'Details',
            removeBookmark: 'Löschen',
            saveBookmark: 'Speichern als Lesezeichen',
            share: 'Teilen',
            reportIssue: 'Problem melden',
        },
        sr: {
            details: 'Detalji',
            removeBookmark: 'Ukloni Bookmark',
            saveBookmark: 'Sačuvaj kao Bookmark',
            share: 'Podelite',
            reportIssue: 'Prijavite Problem',
        },
        ja: {
            details: '詳細',
            removeBookmark: 'ブックマークを削除',
            saveBookmark: 'ブックマークとして保存',
            share: '共有',
            reportIssue: '問題を報告',
        },
        pt: {
            details: 'Detalhes',
            removeBookmark: 'Remover Marcador',
            saveBookmark: 'Salvar como Marcador',
            share: 'Compartilhar',
            reportIssue: 'Relatar Problema',
        },
    }
    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

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
                    <DropdownMenu.Item key="details" onSelect={async () => {
                        context?.openDetailsBottomSheet?.();
                    }}>
                        <DropdownMenu.ItemTitle>
                            {i18n.t('details')}
                        </DropdownMenu.ItemTitle>
                        <DropdownMenu.ItemIcon ios={{ name: 'info.circle' }}>
                            <IconSymbol name='info.circle' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                        </DropdownMenu.ItemIcon>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item key="bookmark" onSelect={async () => {
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
                    <DropdownMenu.Item key="share" onSelect={async () => {
                        await Sharing.shareAsync(`https://acchymns.app/display/${bookId}/${songId}`, {
                            dialogTitle: songData?.title
                        })
                    }}>
                        <DropdownMenu.ItemTitle>{i18n.t('share')}</DropdownMenu.ItemTitle>
                        <DropdownMenu.ItemIcon ios={{ name: 'square.and.arrow.up' }}>
                            <IconSymbol name='square.and.arrow.up' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                        </DropdownMenu.ItemIcon>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item key="report-issue" onSelect={() => { }} destructive={true} >
                        <DropdownMenu.ItemTitle>{i18n.t('reportIssue')}</DropdownMenu.ItemTitle>
                        <DropdownMenu.ItemIcon ios={{ name: 'exclamationmark.bubble' }}>
                            <IconSymbol name='exclamationmark.bubble' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                        </DropdownMenu.ItemIcon>
                    </DropdownMenu.Item>
                </DropdownMenu.Group>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}