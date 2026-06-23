import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTALLED_DIGESTS_KEY = 'hymnalInstalledDigests';

export type InstalledHymnalPackage = {
    digest: string;
    installedAt: string;
};

export type InstalledDigests = Record<string, InstalledHymnalPackage>;

const HYMNAL_RELEASES_REPO = 'ACC-Hymns/books';

export function releasePreferenceKey(releaseTag: string | null | undefined): string {
    return releaseTag?.trim() || '';
}

export function getHymnalReleaseApiUrl(releaseTag: string | null | undefined): string {
    const tag = releaseTag?.trim();
    if (!tag) {
        return `https://api.github.com/repos/${HYMNAL_RELEASES_REPO}/releases/latest`;
    }

    return `https://api.github.com/repos/${HYMNAL_RELEASES_REPO}/releases/tags/${encodeURIComponent(tag)}`;
}

export type GitHubReleaseSummary = {
    tag_name: string;
    name: string;
    published_at: string;
    prerelease: boolean;
};

export type GitHubReleaseAsset = {
    name: string;
    size: number;
    browser_download_url: string;
};

export type GitHubRelease = {
    tag_name: string;
    published_at: string;
    assets: GitHubReleaseAsset[];
};

export type RemoteHymnalPackage = {
    id: string;
    size: number;
    downloadUrl: string;
    sha256: string;
};

export function normalizeDigest(digest: string): string {
    return digest.replace(/^sha256:/i, '').toLowerCase();
}

/** Parse `sha256sum` output from the release workflow (`checksums.sha256`). */
export function parseChecksumsFile(content: string): Record<string, string> {
    const checksums: Record<string, string> = {};

    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }

        const match = trimmed.match(/^([a-fA-F0-9]{64})\s+[\*]?(.*)$/);
        if (!match) {
            continue;
        }

        const [, hash, filename] = match;
        if (!filename.endsWith('.zip')) {
            continue;
        }

        checksums[filename.replace(/\.zip$/, '')] = normalizeDigest(hash);
    }

    return checksums;
}

export async function fetchReleaseChecksums(release: GitHubRelease): Promise<Record<string, string>> {
    const checksumAsset = release.assets.find((asset) => asset.name === 'checksums.sha256');
    if (!checksumAsset) {
        throw new Error(`Release ${release.tag_name} is missing checksums.sha256`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(checksumAsset.browser_download_url, {
            method: 'GET',
            headers: {
                Accept: 'text/plain',
                'Cache-Control': 'no-cache',
            },
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Checksum file error! status: ${response.status}`);
        }

        return parseChecksumsFile(await response.text());
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function loadInstalledDigests(): Promise<InstalledDigests> {
    try {
        const raw = await AsyncStorage.getItem(INSTALLED_DIGESTS_KEY);
        if (!raw) {
            return {};
        }
        return JSON.parse(raw) as InstalledDigests;
    } catch (error) {
        console.error('Failed to load installed hymnal digests:', error);
        return {};
    }
}

export async function saveInstalledDigest(book: string, digest: string): Promise<void> {
    const installed = await loadInstalledDigests();
    installed[book] = {
        digest: normalizeDigest(digest),
        installedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(INSTALLED_DIGESTS_KEY, JSON.stringify(installed));
}

export async function removeInstalledDigest(book: string): Promise<void> {
    const installed = await loadInstalledDigests();
    delete installed[book];
    await AsyncStorage.setItem(INSTALLED_DIGESTS_KEY, JSON.stringify(installed));
}

export async function clearInstalledDigests(): Promise<void> {
    await AsyncStorage.removeItem(INSTALLED_DIGESTS_KEY);
}

export function getRemoteHymnalsFromRelease(
    release: GitHubRelease | undefined,
    checksums: Record<string, string>,
): RemoteHymnalPackage[] {
    if (!release) {
        return [];
    }

    return release.assets
        .filter((asset) => asset.name.endsWith('.zip'))
        .flatMap((asset) => {
            const id = asset.name.replace('.zip', '');
            const sha256 = checksums[id];
            if (!sha256) {
                console.warn(`No checksum found for ${asset.name} in release ${release.tag_name}`);
                return [];
            }

            return [{
                id,
                size: asset.size,
                downloadUrl: asset.browser_download_url,
                sha256,
            }];
        });
}

export function isHymnalInstalled(
    bookId: string,
    bookData: Record<string, { name: { short: string } }>,
): boolean {
    return Object.keys(bookData).some((key) => bookData[key].name.short === bookId);
}

export function isHymnalOutdated(
    bookId: string,
    remoteDigest: string,
    installedDigests: InstalledDigests,
): boolean {
    const installed = installedDigests[bookId];
    if (!installed) {
        return true;
    }
    return normalizeDigest(installed.digest) !== normalizeDigest(remoteDigest);
}

export function getOutdatedHymnals(
    installedBookIds: string[],
    remoteHymnals: RemoteHymnalPackage[],
    installedDigests: InstalledDigests,
): RemoteHymnalPackage[] {
    const remoteById = new Map(remoteHymnals.map((hymnal) => [hymnal.id, hymnal]));

    return installedBookIds
        .map((bookId) => remoteById.get(bookId))
        .filter((hymnal): hymnal is RemoteHymnalPackage => {
            if (!hymnal) {
                return false;
            }
            return isHymnalOutdated(hymnal.id, hymnal.sha256, installedDigests);
        });
}

export async function fetchHymnalRelease(releaseTag: string | null | undefined = null): Promise<GitHubRelease> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(getHymnalReleaseApiUrl(releaseTag), {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
            },
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Release API error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function fetchHymnalReleaseTags(perPage = 20): Promise<GitHubReleaseSummary[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(
            `https://api.github.com/repos/${HYMNAL_RELEASES_REPO}/releases?per_page=${perPage}`,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                },
                signal: controller.signal,
            },
        );

        if (!response.ok) {
            throw new Error(`Release list API error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function fetchHymnalReleaseData(
    installedBookIds: string[],
    releaseTag: string | null | undefined = null,
): Promise<{
    release: GitHubRelease;
    resolvedReleaseTag: string;
    bookSummaries: import('@/constants/types').BookSummary[];
    remoteHymnals: RemoteHymnalPackage[];
    outdatedHymnals: RemoteHymnalPackage[];
    installedDigests: InstalledDigests;
}> {
    const release = await fetchHymnalRelease(releaseTag);

    const [checksums, summariesRes, installedDigests] = await Promise.all([
        fetchReleaseChecksums(release),
        fetch('https://api.acchymns.app/available_hymnals', {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
            },
        }).catch(() => null),
        loadInstalledDigests(),
    ]);

    let bookSummaries: import('@/constants/types').BookSummary[] = [];
    if (summariesRes?.ok) {
        try {
            bookSummaries = await summariesRes.json();
        } catch (error) {
            console.warn('Failed to parse book summaries:', error);
        }
    }

    const remoteHymnals = getRemoteHymnalsFromRelease(release, checksums);
    const outdatedHymnals = getOutdatedHymnals(installedBookIds, remoteHymnals, installedDigests);

    return {
        release,
        resolvedReleaseTag: release.tag_name,
        bookSummaries,
        remoteHymnals,
        outdatedHymnals,
        installedDigests,
    };
}
