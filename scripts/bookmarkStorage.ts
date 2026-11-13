import AsyncStorage from '@react-native-async-storage/async-storage';
import DefaultPreference from 'react-native-default-preference';
import { Bookmark } from '@/constants/types';
import {
    BOOKMARKS_KEY,
    LEGACY_BOOKMARKS_KEY,
    parseBookmarks,
} from '@/scripts/bookmarks';

export async function loadBookmarks(): Promise<Bookmark[]> {
    try {
        const stored = await AsyncStorage.getItem(BOOKMARKS_KEY);
        if (stored !== null) {
            return parseBookmarks(stored);
        }

        const legacy = await DefaultPreference.get(LEGACY_BOOKMARKS_KEY);
        if (!legacy) {
            return [];
        }

        const parsed = parseBookmarks(legacy);
        await saveBookmarks(parsed);
        return parsed;
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        return [];
    }
}

export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
    try {
        await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch (error) {
        console.error('Error saving bookmarks:', error);
    }
}
