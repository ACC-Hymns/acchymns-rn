export const RECENT_SEARCHES_KEY = 'recent_searches';
export const MAX_RECENT_SEARCHES = 5;

export function parseRecentSearches(raw: string | null | undefined): string[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
            return [];
        }

        return parsed.slice(0, MAX_RECENT_SEARCHES);
    } catch {
        return [];
    }
}

export function addRecentSearch(history: string[], search: string): string[] {
    const trimmed = search.trim();
    if (!trimmed) {
        return history.slice(0, MAX_RECENT_SEARCHES);
    }

    const withoutDuplicate = history.filter((item) => item !== trimmed);
    return [trimmed, ...withoutDuplicate].slice(0, MAX_RECENT_SEARCHES);
}
