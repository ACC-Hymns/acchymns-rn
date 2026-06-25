import { canPublishBroadcast, getBroadcastPublishOptions } from '@/scripts/broadcastPublish';
import { HymnalContextType } from '@/constants/context';
import { ECAMP_CHURCH_ID } from '@/constants/broadcastAuth';

function makeContext(overrides: Partial<HymnalContextType> = {}): HymnalContextType {
    return {
        BOOK_DATA: {},
        SET_BOOK_DATA: () => undefined,
        discoverPageVisited: null,
        setDiscoverPageVisited: () => undefined,
        legacyNumberGrouping: null,
        setLegacyNumberGrouping: () => undefined,
        languageOverride: null,
        setLanguageOverride: () => undefined,
        themeOverride: null,
        setThemeOverride: () => undefined,
        invertSheetMusic: null,
        setInvertSheetMusic: () => undefined,
        postHogOptedIn: null,
        setPostHogOptedIn: () => undefined,
        broadcastingToken: null,
        setBroadcastingToken: () => undefined,
        broadcastingChurch: 'church-1',
        setBroadcastingChurch: () => undefined,
        hymnSignHost: null,
        setHymnSignHost: () => undefined,
        hymnSignPort: 81,
        setHymnSignPort: () => undefined,
        hymnalReleaseTag: null,
        setHymnalReleaseTag: () => undefined,
        onLayoutHomeView: () => undefined,
        resetPreferences: async () => undefined,
        setDownloadProgressValues: () => undefined,
        dismissedHymnalPackages: {},
        dismissHymnalPackage: () => undefined,
        clearDismissedHymnalPackage: () => undefined,
        clearAllDismissedHymnalPackages: () => undefined,
        completeHymnalPackage: async () => undefined,
        ...overrides,
    };
}

describe('canPublishBroadcast', () => {
    it('requires church id for aws churches', () => {
        expect(canPublishBroadcast(makeContext({ broadcastingChurch: null }))).toBe(false);
        expect(canPublishBroadcast(makeContext({ broadcastingChurch: 'church-1' }))).toBe(true);
    });

    it('uses configured hymn sign host for ECAMP', () => {
        const options = getBroadcastPublishOptions(
            makeContext({
                broadcastingChurch: ECAMP_CHURCH_ID,
                hymnSignHost: '10.0.0.50',
                hymnSignPort: 8080,
            }),
        );

        expect(options.target).toBe('hymnsign');
        expect(options.hymnSignHost).toBe('10.0.0.50');
        expect(options.hymnSignPort).toBe(8080);
        expect(canPublishBroadcast(makeContext({ broadcastingChurch: ECAMP_CHURCH_ID }))).toBe(true);
    });

    it('routes other churches to aws', () => {
        const options = getBroadcastPublishOptions(
            makeContext({
                broadcastingChurch: 'church-1',
            }),
        );

        expect(options.target).toBe('aws');
        expect(options.hymnSignHost).toBeNull();
    });
});
