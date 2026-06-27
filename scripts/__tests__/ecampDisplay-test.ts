import { BookSummary } from '@/constants/types';
import {
    findBookForDisplayRecord,
    formatEcampSingingLabel,
    parseEcampDisplayItem,
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
    it('parses active ECAMP display records', () => {
        expect(
            parseEcampDisplayItem({
                SONG_NUMBER: { S: '456' },
                BOOK_ID: { S: 'Gospel Hymns' },
                VERSES: { NS: ['1', '2'] },
            }),
        ).toEqual({
            songNumber: '456',
            bookMedium: 'Gospel Hymns',
            verses: [1, 2],
        });
    });

    it('returns null when the sign is cleared', () => {
        expect(
            parseEcampDisplayItem({
                SONG_NUMBER: { S: '' },
                BOOK_ID: { S: 'Gospel Hymns' },
                VERSES: { NS: ['-1'] },
            }),
        ).toBeNull();

        expect(
            parseEcampDisplayItem({
                SONG_NUMBER: { S: '---' },
                BOOK_ID: { S: 'Gospel Hymns' },
                VERSES: { NS: ['-1'] },
            }),
        ).toBeNull();
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
});
