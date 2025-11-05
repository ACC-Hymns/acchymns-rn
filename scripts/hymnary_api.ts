import { Song } from '@/constants/types';
import { convert } from '@/scripts/csv2json';

type SearchOptions = {
    type?: 'texts' | 'tunes' | 'instances' | 'people' | 'hymnals' | 'unspecified';
}

type SearchResult = {
    authors: string;
    displayTitle: string;
    firstLine: string;
    languages: string;
    meter: string;
    refrainFirstLine: string;
    textAuthNumber: string;
    textSources: string;
    textTitle: string;
    totalInstances: string;
}

function compareTitles(a: SearchResult, b: Song, strength: number): boolean {
    
    switch (strength) {
        case 1:
            let aTitle = a.displayTitle.toLowerCase();
            let bTitle = b.title.toLowerCase();
            return aTitle.startsWith(bTitle);
        case 2:
            let aSpecialTitle = a.displayTitle.toLowerCase();
            let bSpecialTitle = b.title.toLowerCase();
            return aSpecialTitle.replace(/[^a-z0-9]/gi, '').startsWith(bSpecialTitle.replace(/[^a-z0-9]/gi, ''));
        case 3:
            let aOh = a.displayTitle.replace('Oh', 'O')
            let bOh = b.title.replace('Oh', 'O')
            aOh = aOh.toLowerCase();
            bOh = bOh.toLowerCase();

            return aOh.replace(/[^a-z0-9]/gi, '').startsWith(bOh.replace(/[^a-z0-9]/gi, ''));
        default:
            return a.displayTitle.startsWith(b.title);
    }
    
}

async function searchHymnary(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!options) {
        options = {
            type: 'texts'
        };
    }

    // convert query to url format
    query = encodeURIComponent(query);
    const url = `https://hymnary.org/search?qu=in%3A${options?.type}%20all%3A${query}&export=csv`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.text();
        const jsonData = convert(data) as SearchResult[];
        return jsonData;
    } catch (error) {
        console.log('Error fetching data:', error);
        return [];
    }
}

export { searchHymnary, compareTitles };
export type { SearchResult, SearchOptions };