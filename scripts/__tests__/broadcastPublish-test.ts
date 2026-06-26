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

    it('routes ECAMP to hymnsign without requiring a local IP', () => {
        const options = getBroadcastPublishOptions(
            makeContext({
                broadcastingChurch: ECAMP_CHURCH_ID,
            }),
        );

        expect(options.target).toBe('hymnsign');
        expect(options.churchId).toBe(ECAMP_CHURCH_ID);
        expect(canPublishBroadcast(makeContext({ broadcastingChurch: ECAMP_CHURCH_ID }))).toBe(true);
    });

    it('routes other churches to aws', () => {
        const options = getBroadcastPublishOptions(
            makeContext({
                broadcastingChurch: 'church-1',
            }),
        );

        expect(options.target).toBe('aws');
    });
});
