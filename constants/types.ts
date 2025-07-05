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

type SongSearchInfo = Song & {
    stripped_title?: string;
    stripped_first_line?: string;
    book: BookSummary;
};

enum SortMode {
    NUMERICAL = 'NUMERICAL',
    ALPHABETICAL = 'ALPHABETICAL',
    TOPICAL = 'TOPICAL',
};

type Bookmark = {
    book: string;
    number: string;
}

type BookIndex = Record<string, string[]>;

type DiscoverMatch = {
    type: "VERSE" | "TITLE";
    hymn_title: string;
    hymn_number: string;
    hymnal_id: string;
    similarity: number;
    verses?: {
        verse_number: number;
        verse_text: string;
        similarity: number;
    }[] | undefined;
}

type DiscoverResult = {
    prompt: string;
    allowed_hymnals: string[];
    top_matches: DiscoverMatch[];
}

interface DiscoverSongInfo extends SongSearchInfo {
    type: "VERSE" | "TITLE";
    verses?: {
        verse_number: number;
        verse_text: string;
        similarity: number;
    }[] | undefined;
}

export type {
    BookSummary,
    Song,
    SongList,
    SongSearchInfo,
    SongReference,
    DiscoverMatch,
    DiscoverResult,
    Bookmark,
    BookIndex
};

export { DiscoverSongInfo, BookSourceType, SortMode }
