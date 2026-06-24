import AsyncStorage from '@react-native-async-storage/async-storage';
import { Reading } from '@/constants/bible';

export type ScriptureSelection = {
    bookName: string;
    chapter: number;
    rangeStart: number;
    rangeEnd: number | null;
};

export const SCRIPTURE_PICKER_COUNT = 5;
export const BIBLE_REFERENCES_KEY = 'broadcast_bible_references';

type ReferencesListener = (references: (ScriptureSelection | null)[]) => void;

let references: (ScriptureSelection | null)[] = Array.from(
    { length: SCRIPTURE_PICKER_COUNT },
    () => null,
);
let storageLoaded = false;
const listeners = new Set<ReferencesListener>();

function notifyListeners() {
    listeners.forEach((listener) => listener(references));
}

export function getScriptureReferences() {
    return references;
}

export function getScriptureReference(index: number) {
    return references[index] ?? null;
}

export function initScriptureReferences(next: (ScriptureSelection | null)[]) {
    references = [...next];
    storageLoaded = true;
    notifyListeners();
}

export function setScriptureReference(index: number, value: ScriptureSelection | null) {
    references = [...references];
    references[index] = value;
    storageLoaded = true;
    notifyListeners();
    void AsyncStorage.setItem(BIBLE_REFERENCES_KEY, JSON.stringify(references)).catch((error) => {
        console.error('Error saving bible references:', error);
    });
}

export function subscribeScriptureReferences(listener: ReferencesListener) {
    listeners.add(listener);
    listener(references);
    return () => {
        listeners.delete(listener);
    };
}

export function parseStoredReferences(raw: string | null): (ScriptureSelection | null)[] {
    const empty = Array.from({ length: SCRIPTURE_PICKER_COUNT }, () => null);

    if (!raw) {
        return empty;
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return empty;
        }

        return Array.from({ length: SCRIPTURE_PICKER_COUNT }, (_, index) => {
            const item = parsed[index];
            if (
                !item
                || typeof item !== 'object'
                || typeof item.bookName !== 'string'
                || typeof item.chapter !== 'number'
                || typeof item.rangeStart !== 'number'
                || (item.rangeEnd !== null && typeof item.rangeEnd !== 'number')
            ) {
                return null;
            }

            return {
                bookName: item.bookName,
                chapter: item.chapter,
                rangeStart: item.rangeStart,
                rangeEnd: item.rangeEnd,
            } satisfies ScriptureSelection;
        });
    } catch {
        return empty;
    }
}

export async function ensureScriptureReferencesLoaded() {
    if (storageLoaded) {
        return references;
    }

    try {
        const stored = await AsyncStorage.getItem(BIBLE_REFERENCES_KEY);
        initScriptureReferences(parseStoredReferences(stored));
    } catch (error) {
        console.error('Error loading bible references:', error);
        initScriptureReferences(Array.from({ length: SCRIPTURE_PICKER_COUNT }, () => null));
    }

    return references;
}

export function selectionToReading(selection: ScriptureSelection): Reading {
    return {
        book: selection.bookName,
        chapter_start: String(selection.chapter),
        chapter_end: String(selection.chapter),
        verse_start: String(selection.rangeStart),
        verse_end: selection.rangeEnd != null ? String(selection.rangeEnd) : undefined,
    };
}

export function formatScriptureSelection(selection: ScriptureSelection | null | undefined) {
    if (!selection) {
        return 'Select Passage';
    }

    if (selection.rangeStart != null && selection.rangeEnd != null) {
        return `${selection.bookName} ${selection.chapter}:${selection.rangeStart}-${selection.rangeEnd}`;
    }

    if (selection.rangeStart != null) {
        return `${selection.bookName} ${selection.chapter}:${selection.rangeStart}`;
    }

    if (selection.chapter) {
        return `${selection.bookName} ${selection.chapter}`;
    }

    return selection.bookName;
}

export function parsePickerIndex(raw: string | string[] | undefined) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}
