import AsyncStorage from '@react-native-async-storage/async-storage';
import { HYMNAL_SORT_KEY, parseStoredHymnalOrder } from '@/scripts/hymnalSort';

export async function loadHymnalSortOrder(): Promise<{ order: string[]; isValid: boolean }> {
    try {
        const stored = await AsyncStorage.getItem(HYMNAL_SORT_KEY);
        return parseStoredHymnalOrder(stored);
    } catch (error) {
        console.error('Error loading sort order:', error);
        return { order: [], isValid: false };
    }
}

export async function saveHymnalSortOrder(order: string[]): Promise<void> {
    try {
        await AsyncStorage.setItem(HYMNAL_SORT_KEY, JSON.stringify(order));
    } catch (error) {
        console.error('Error saving sort order:', error);
    }
}
