import {
    createBibleCommand,
    createBrightnessCommand,
    createClearCommand,
    createSongCommand,
    toDynamoFields,
    toHymnSignMessages,
    toIoTPayload,
    versesToVerseStates,
} from '@/scripts/displayCommand';

describe('displayCommand adapters', () => {
    it('maps all verses to hymn sign states', () => {
        expect(versesToVerseStates([-2]).every(Boolean)).toBe(true);
        expect(versesToVerseStates([-1]).every(Boolean)).toBe(true);
        expect(versesToVerseStates([]).every(Boolean)).toBe(true);
    });

    it('maps selected verses to hymn sign states', () => {
        const states = versesToVerseStates([1, 3, 5]);
        expect(states[0]).toBe(true);
        expect(states[1]).toBe(false);
        expect(states[2]).toBe(true);
        expect(states[4]).toBe(true);
    });

    it('maps song command to dynamo fields', () => {
        const command = createSongCommand({
            number: '123',
            bookMedium: 'Gospel Hymns',
            verses: [1, 2],
            bookColor: '#ff0000',
        });

        expect(toDynamoFields(command)).toEqual({
            song: '123',
            book: 'Gospel Hymns',
            verses: [1, 2],
            color: '#ff0000',
        });
    });

    it('maps bible command to dynamo fields', () => {
        const command = createBibleCommand('John', '3:16');
        expect(toDynamoFields(command)).toEqual({
            song: 'John',
            book: 'BIBLE',
            verses: [],
            color: '3:16',
        });
    });

    it('maps clear command to dynamo fields', () => {
        expect(toDynamoFields(createClearCommand())).toEqual({
            song: '',
            book: '',
            verses: [-1],
            color: '',
        });
    });

    it('maps song command to hymn sign wire message', () => {
        const command = createSongCommand({
            number: '0123',
            bookMedium: 'Gospel Hymns',
            verses: [1, 3],
            bookColor: '#ff0000',
        });

        expect(toHymnSignMessages(command)).toEqual([
            {
                type: 'number',
                value: '123',
                hymnal: 'Gospel Hymns',
                verseStates: versesToVerseStates([1, 3]),
            },
        ]);
    });

    it('returns no hymn sign messages for bible command', () => {
        expect(toHymnSignMessages(createBibleCommand('John', '3:16'))).toEqual([]);
    });

    it('maps song command to IoT payload', () => {
        const command = createSongCommand({
            number: '0123',
            bookMedium: 'Gospel Hymns',
            verses: [1, 3],
            bookColor: '#ff0000',
        });

        expect(toIoTPayload(command)).toEqual({
            action: 'song',
            number: '123',
            hymnal: 'Gospel Hymns',
            verses: [1, 3],
            bookColor: '#ff0000',
        });
    });

    it('returns null IoT payload for bible command', () => {
        expect(toIoTPayload(createBibleCommand('John', '3:16'))).toBeNull();
    });

    it('maps brightness command to IoT payload', () => {
        const command = createBrightnessCommand(200, 128);

        expect(toIoTPayload(command)).toEqual({
            action: 'brightness',
            large: 200,
            small: 128,
        });
    });
});
