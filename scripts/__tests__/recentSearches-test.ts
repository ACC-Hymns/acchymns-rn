import { addRecentSearch, parseRecentSearches } from '@/scripts/recentSearches';

describe('parseRecentSearches', () => {
    it('keeps only the first five strings', () => {
        expect(parseRecentSearches(JSON.stringify(['a', 'b', 'c', 'd', 'e', 'f']))).toEqual([
            'a', 'b', 'c', 'd', 'e',
        ]);
    });

    it('rejects invalid payloads', () => {
        expect(parseRecentSearches(JSON.stringify(['a', 1]))).toEqual([]);
        expect(parseRecentSearches('{')).toEqual([]);
        expect(parseRecentSearches(null)).toEqual([]);
    });
});

describe('addRecentSearch', () => {
    it('moves an existing search to the front and caps the list', () => {
        expect(addRecentSearch(['grace', 'faith', 'hope', 'love', 'peace'], 'faith')).toEqual([
            'faith', 'grace', 'hope', 'love', 'peace',
        ]);
        expect(addRecentSearch(['a', 'b', 'c', 'd', 'e'], 'f')).toEqual(['f', 'a', 'b', 'c', 'd']);
    });

    it('ignores blank searches', () => {
        expect(addRecentSearch(['grace'], '   ')).toEqual(['grace']);
    });
});
