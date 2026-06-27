import {
    DisplayCommand,
    HYMNSIGN_VERSE_COUNT,
} from '@/constants/displayCommand';

export type HymnSignWireMessage =
    | { type: 'number'; value: string; hymnal: string; verseStates?: boolean[] }
    | { type: 'toggle'; states: boolean[]; hymnal: string; number: string }
    | { type: 'clear'; clearHymnal: boolean }
    | { type: 'hymnal'; hymnal: string }
    | { type: 'brightness'; large: number; small: number };

export type DynamoBroadcastFields = {
    song: string;
    book: string;
    verses: number[];
    color: string;
};

export function versesToVerseStates(verses: number[]): boolean[] {
    const states = Array.from({ length: HYMNSIGN_VERSE_COUNT }, () => false);

    if (verses.length === 0 || verses.includes(-1) || verses[0] === -2) {
        return Array.from({ length: HYMNSIGN_VERSE_COUNT }, () => true);
    }

    for (const verse of verses) {
        if (verse >= 1 && verse <= HYMNSIGN_VERSE_COUNT) {
            states[verse - 1] = true;
        }
    }

    return states;
}

export function toDynamoFields(command: DisplayCommand): DynamoBroadcastFields {
    switch (command.action) {
        case 'song':
            return {
                song: command.number,
                book: command.hymnal,
                verses: command.verses,
                color: command.bookColor,
            };
        case 'bible':
            return {
                song: command.book,
                book: 'BIBLE',
                verses: [],
                color: command.reference,
            };
        case 'clear':
            return {
                song: '',
                book: '',
                verses: [-1],
                color: '',
            };
        case 'brightness':
            return {
                song: '',
                book: '',
                verses: [-1],
                color: '',
            };
    }
}

export function toIoTPayload(command: DisplayCommand): Record<string, unknown> | null {
    switch (command.action) {
        case 'song': {
            const number = command.number.replace(/^0+/, '') || '0';
            return {
                action: 'song',
                number,
                hymnal: command.hymnal,
                verses: command.verses,
                bookColor: command.bookColor,
            };
        }
        case 'clear':
            return {
                action: 'clear',
                clearHymnal: command.clearHymnal ?? true,
            };
        case 'brightness':
            return {
                action: 'brightness',
                large: command.large,
                small: command.small,
            };
        case 'bible':
            return null;
    }
}

export function toHymnSignMessages(command: DisplayCommand): HymnSignWireMessage[] {
    switch (command.action) {
        case 'song': {
            const verseStates = versesToVerseStates(command.verses);
            const number = command.number.replace(/^0+/, '') || '0';

            return [{ type: 'number', value: number, hymnal: command.hymnal, verseStates }];
        }
        case 'clear':
            return [{ type: 'clear', clearHymnal: command.clearHymnal ?? true }];
        case 'bible':
            return [];
        case 'brightness':
            return [{ type: 'brightness', large: command.large, small: command.small }];
    }
}

export function createSongCommand(options: {
    number: string;
    bookMedium: string;
    verses: number[];
    bookColor: string;
}): DisplayCommand {
    return {
        action: 'song',
        number: options.number,
        hymnal: options.bookMedium,
        verses: options.verses,
        bookColor: options.bookColor,
    };
}

export function createBibleCommand(book: string, reference: string): DisplayCommand {
    return {
        action: 'bible',
        book,
        reference,
    };
}

export function createClearCommand(clearHymnal = true): DisplayCommand {
    return {
        action: 'clear',
        clearHymnal,
    };
}

export function createBrightnessCommand(large: number, small: number): DisplayCommand {
    return {
        action: 'brightness',
        large,
        small,
    };
}
