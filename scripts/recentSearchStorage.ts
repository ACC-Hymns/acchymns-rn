import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    MAX_RECENT_SEARCHES,
    RECENT_SEARCHES_KEY,
    parseRecentSearches,
} from '@/scripts/recentSearches';

export async function loadRecentSearches(): Promise<string[]> {
    try {
        const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        return parseRecentSearches(stored);
    } catch (error) {
        console.error('Error loading searches:', error);
        return [];
    }
}

export async function saveRecentSearches(searches: string[]): Promise<void> {
    try {
        await AsyncStorage.setItem(
            RECENT_SEARCHES_KEY,
            JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES)),
        );
    } catch (error) {
        console.error('Error saving searches:', error);
    }
}

export async function clearRecentSearches(): Promise<void> {
    await saveRecentSearches([]);
}
