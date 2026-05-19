import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
/** Persistent Layer-0 identity — minted once on first launch, never rotated. */
export const STABLE_USER_ID_KEY = 'stableUserId';

/**
 * Returns the app's canonical user id. Creates and persists a UUID on first call.
 * Use this string as PostHog `distinct_id` everywhere (client and server).
 */
export async function getOrCreateStableUserId(): Promise<string> {
    const existing = await AsyncStorage.getItem(STABLE_USER_ID_KEY);
    if (existing) {
        return existing;
    }

    const id = Crypto.randomUUID();
    await AsyncStorage.setItem(STABLE_USER_ID_KEY, id);
    return id;
}
