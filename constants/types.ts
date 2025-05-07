type BookSummary = {
    name: {
        short: string;
        medium: string;
        long: string;
    };
    primaryColor: string;
    secondaryColor: string;
    fileExtension: string;
    addOn: boolean;
    indexAvailable: boolean;
    source?: BookSourceType;
    size?: number; // in MB
}

enum BookSourceType {
    BUNDLED,
    HIDDEN,
    PREVIEW,
    IMPORTED,
    DOWNLOADED
};

type Song = {
    title: string;
    number?: string; // Numbers unfortunately can be strings: e.g. 403a GH
    notes?: string[];
    first_line?: string;
};

type SongList = Record<string, Song>;

type SongReference = {
    book: string;
    number: string;
};

enum SortMode {
    NUMERICAL = 'NUMERICAL',
    ALPHABETICAL = 'ALPHABETICAL',
    TOPICAL = 'TOPICAL',
};

export type {
    BookSummary,
    Song,
    SongList,
    SongReference
};

export { BookSourceType, SortMode }
