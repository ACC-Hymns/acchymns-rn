import { router } from 'expo-router';
import { ScriptureSelection } from '@/constants/scripturePicker';

const PICKER_ROOT = '/(main)/(tabs)/(settings)/scripture_picker';
const PICKER_BOOK = '/(main)/(tabs)/(settings)/scripture_picker/[book]';
const PICKER_CHAPTER = '/(main)/(tabs)/(settings)/scripture_picker/[book]/[chapter]';

export function openScripturePicker(index: number, value: ScriptureSelection | null | undefined) {
    const indexParam = String(index);

    if (value?.rangeStart != null) {
        router.push({
            pathname: PICKER_ROOT,
            params: { index: indexParam },
        });
        router.push({
            pathname: PICKER_BOOK,
            params: { book: value.bookName, index: indexParam },
        });
        router.push({
            pathname: PICKER_CHAPTER,
            params: {
                book: value.bookName,
                chapter: String(value.chapter),
                index: indexParam,
            },
        });
        return;
    }

    if (value?.bookName) {
        router.push({
            pathname: PICKER_ROOT,
            params: { index: indexParam },
        });
        router.push({
            pathname: PICKER_BOOK,
            params: { book: value.bookName, index: indexParam },
        });
        return;
    }

    router.push({
        pathname: PICKER_ROOT,
        params: { index: indexParam },
    });
}
