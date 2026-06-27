import { BookSummary } from '@/constants/types';
import {
    ecampDisplayStateKey,
    ecampDisplayStatesEqual,
    findBookForDisplayRecord,
    formatEcampSingingLabel,
    parseEcampCommandPayload,
    parseEcampDisplayMessage,
} from '@/scripts/ecampDisplay';

const bookData: Record<string, BookSummary> = {
    GH: {
        name: { short: 'GH', medium: 'Gospel Hymns', long: 'Gospel Hymns' },
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        fileExtension: 'pdf',
        addOn: false,
        indexAvailable: false,
    },
};

describe('ecampDisplay', () => {
    it('parses active ECAMP command payloads', () => {
        expect(
            parseEcampCommandPayload(JSON.stringify({
                action: 'song',
                number: '456',
                hymnal: 'Gospel Hymns',
                verses: [1, 2],
            })),
        ).toEqual({
            songNumber: '456',
            bookMedium: 'Gospel Hymns',
            verses: [1, 2],
        });
    });

    it('returns null when the sign is cleared or payload is unrelated', () => {
        expect(parseEcampCommandPayload(JSON.stringify({ action: 'clear' }))).toBeNull();
        expect(parseEcampCommandPayload(JSON.stringify({ action: 'brightness', large: 200, small: 100 }))).toBeNull();
        expect(parseEcampCommandPayload('not-json')).toBeNull();
    });

    it('ignores unrelated MQTT payloads without treating them as clear', () => {
        expect(parseEcampDisplayMessage(JSON.stringify({ action: 'clear' }))).toEqual({ kind: 'clear' });
        expect(parseEcampDisplayMessage(JSON.stringify({ action: 'brightness', large: 200, small: 100 }))).toEqual({
            kind: 'ignore',
        });
        expect(parseEcampDisplayMessage(JSON.stringify({ action: 'ping' }))).toEqual({ kind: 'ignore' });
        expect(parseEcampDisplayMessage('not-json')).toEqual({ kind: 'ignore' });
    });

    it('matches books by medium, short, or long name', () => {
        expect(findBookForDisplayRecord('Gospel Hymns', bookData)?.name.short).toBe('GH');
        expect(findBookForDisplayRecord('gh', bookData)?.name.short).toBe('GH');
        expect(findBookForDisplayRecord('GH', bookData)?.name.short).toBe('GH');
    });

    it('formats the singing label with or without a resolved title', () => {
        const display = {
            songNumber: '456',
            bookMedium: 'Gospel Hymns',
            verses: [1, 2],
        };

        expect(formatEcampSingingLabel(display, 'Amazing Grace')).toBe('Amazing Grace (#456)');
        expect(formatEcampSingingLabel(display, null)).toBe('#456');
    });

    it('compares display state by song content instead of object identity', () => {
        const left = {
            songNumber: '456',
            bookMedium: 'Gospel Hymns',
            verses: [1, 2],
        };
        const right = {
            songNumber: '456',
            bookMedium: 'Gospel Hymns',
            verses: [1, 2],
        };

        expect(ecampDisplayStateKey(left)).toBe('456|Gospel Hymns|1,2');
        expect(ecampDisplayStatesEqual(left, right)).toBe(true);
        expect(
            ecampDisplayStatesEqual(left, {
                ...right,
                songNumber: '457',
            }),
        ).toBe(false);
    });
});
