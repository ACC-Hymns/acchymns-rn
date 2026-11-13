import { parseStoredHymnalOrder, reconcileHymnalOrder } from '@/scripts/hymnalSort';

describe('parseStoredHymnalOrder', () => {
    it('treats a missing value as an empty valid order', () => {
        expect(parseStoredHymnalOrder(null)).toEqual({ order: [], isValid: true });
    });

    it('dedupes a string array', () => {
        expect(parseStoredHymnalOrder(JSON.stringify(['GH', 'ZH', 'GH']))).toEqual({
            order: ['GH', 'ZH'],
            isValid: true,
        });
    });

    it('rejects malformed json and mixed arrays', () => {
        expect(parseStoredHymnalOrder('{')).toEqual({ order: [], isValid: false });
        expect(parseStoredHymnalOrder(JSON.stringify(['GH', 1]))).toEqual({ order: [], isValid: false });
    });
});

describe('reconcileHymnalOrder', () => {
    it('keeps the saved order and appends newly installed hymnals', () => {
        expect(reconcileHymnalOrder(['ZH', 'GH', 'MISSING'], ['GH', 'JH', 'ZH'])).toEqual([
            'ZH', 'GH', 'JH',
        ]);
    });
});
