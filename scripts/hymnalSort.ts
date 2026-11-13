export const HYMNAL_SORT_KEY = 'hymnal_sort_order';

export function parseStoredHymnalOrder(raw: string | null): { order: string[]; isValid: boolean } {
    if (!raw) {
        return { order: [], isValid: true };
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
            return { order: [], isValid: false };
        }

        return { order: [...new Set(parsed)], isValid: true };
    } catch {
        return { order: [], isValid: false };
    }
}

export function reconcileHymnalOrder(savedOrder: string[], currentKeys: string[]): string[] {
    const currentKeySet = new Set(currentKeys);
    const normalizedSaved = [...new Set(savedOrder)].filter((key) => currentKeySet.has(key));
    const missingKeys = currentKeys.filter((key) => !normalizedSaved.includes(key));
    return [...normalizedSaved, ...missingKeys];
}
