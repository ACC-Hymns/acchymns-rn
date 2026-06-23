import { BookIndex, BookSummary, SongList } from '@/constants/types';
import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { unzip } from 'react-native-zip-archive';
import { hashFileSha256 } from './fileHash';
import {
    clearInstalledDigests,
    normalizeDigest,
    removeInstalledDigest,
    saveInstalledDigest,
} from './hymnalUpdates';
import { createThrottledProgress } from './throttledProgress';

const HYMNAL_FOLDER = 'Hymnals'; // folder name in the document directory
const TEMP_FOLDER = 'temp'; // folder name in the document directory
const GITHUB_BASE_URL = `https://raw.githubusercontent.com/ACC-Hymns/books/refs/heads/main`
const downloadingBooks = new Set<string>();

type DownloadProgressUpdater = (book: string, progress: number) => void;
let downloadProgressUpdater: DownloadProgressUpdater | null = null;

export function setHymnalDownloadProgressUpdater(updater: DownloadProgressUpdater | null) {
    downloadProgressUpdater = updater;
}

export function isHymnalDownloading(book: string): boolean {
    return downloadingBooks.has(book);
}

type HymnalInstallCompletionHandler = () => void | Promise<void>;
const installCompletionHandlers = new Map<string, HymnalInstallCompletionHandler>();

export function registerHymnalInstallCompletion(book: string, handler: HymnalInstallCompletionHandler) {
    installCompletionHandlers.set(book, handler);
}

export function unregisterHymnalInstallCompletion(book: string) {
    installCompletionHandlers.delete(book);
}

function reportDownloadProgress(book: string, onProgress: ((progress: number) => void) | undefined, progress: number) {
    onProgress?.(progress);
    downloadProgressUpdater?.(book, progress);
}

function clearDownloadProgress(book: string, onProgress?: (progress: number) => void) {
    reportDownloadProgress(book, onProgress, 0);
}
const DEFAULT_HYMNALS = [
    'ZH',
    'GH',
    'HG',
    'JH',
];

export { HYMNAL_FOLDER, GITHUB_BASE_URL, DEFAULT_HYMNALS };

// book name should be short like "ZH, GH, HG, JH"

/* Folder structure:

    ZH:
        songs:
            - 1.png
            - 2.png
        - summary.json
        - index.json
        - songs.json
        - .signature
*/


async function loadHymnals() {
    const BOOK_DATA: Record<string, BookSummary> = {};
    // get list of folders in the document directory
    if (!Paths.document.exists) {
        throw new Error("Document directory is not available.");
    }


    const hymnalFolder = new Directory(Paths.document, HYMNAL_FOLDER);
    if (!hymnalFolder.exists) {
        hymnalFolder.create({ intermediates: true });
    }

    // read all the folders in the hymnal folder and load the summary.json file
    // Process in parallel to avoid blocking
    const books = hymnalFolder.info().files || [];


    const results = await Promise.all(
        books.map(async (book: any) => {

            const summaryFile = new File(Paths.document, `${HYMNAL_FOLDER}/${book}/summary.json`);
            if (summaryFile.exists) {
                try {
                    const summaryContent = await summaryFile.text();
                    const summary = JSON.parse(summaryContent) as BookSummary;
                    return { book, summary, shouldDelete: false };
                } catch (error) {
                    console.error(`Error parsing summary for ${book}:`, error);
                    return { book, summary: null, shouldDelete: true };
                }
            } else {
                return { book, summary: null, shouldDelete: true };
            }
        })
    );

    // Process results and handle deletions
    for (const result of results) {
        if (result.summary) {
            BOOK_DATA[result.book] = result.summary;
        } else if (result.shouldDelete) {
            // // if the summary file is not found, purge the book folder
            // const bookFolder = new Directory(Paths.document, `${HYMNAL_FOLDER}/${result.book}`);
            // if (bookFolder.exists) {
            //     try {
            //         let list = await bookFolder.list();
            //         console.log(`List of files in ${result.book}:`, list);
            //         for (const file of list) {
            //             console.log(`File: ${file.name}`);
            //         }
            //     } catch (e) {
            //         console.error(`Error deleting folder for ${result.book}:`, e);
            //     }
            //     console.log(`Deleted folder for ${result.book}.`);
            // } else {
            //     console.log(`Folder for ${result.book} does not exist.`);
            // }
        }
    }
    return BOOK_DATA;
}

const VERIFY_PROGRESS_START = 101;
const EXTRACT_PROGRESS_START = 110;

function yieldToEventLoop(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => setTimeout(resolve, 0));
    });
}

async function downloadHymnal(
    book: string,
    expectedSHA256: string,
    downloadUrl: string,
    expectedSizeBytes?: number,
    isUpdate = false,
    onProgress?: (progress: number) => void,
    onFinish?: (success: boolean) => void,
) {

    // prevent downloading if already downloading
    if (downloadingBooks.has(book)) {
        return;
    }
    downloadingBooks.add(book);
    const reportProgress = createThrottledProgress((progress) => {
        reportDownloadProgress(book, onProgress, progress);
    });
    reportProgress(-1);

    // Use the release asset URL so downloads match the checksums.sha256 manifest.
    const zipUrl = downloadUrl;

    // Ensure we don't have double slashes and use a standard filename
    const zipFileName = `${book}-package.zip`;
    const zipFileUri = FileSystem.cacheDirectory + zipFileName;

    // 2. Ensure the destination directory exists (Legacy style)
    const hymnalsDir = FileSystem.documentDirectory + HYMNAL_FOLDER;
    const dirInfo = await FileSystem.getInfoAsync(hymnalsDir);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(hymnalsDir, { intermediates: true });
    }

    const downloadResumable = FileSystem.createDownloadResumable(
        zipUrl,
        zipFileUri,
        {},
        (downloadProgress) => {
            if (downloadProgress.totalBytesExpectedToWrite > 0) {
                const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
                reportProgress(progress);
            }
        }
    );

    try {
        // Delete the file if it somehow exists from a failed run
        const fileInfo = await FileSystem.getInfoAsync(zipFileUri);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(zipFileUri);
        }

        const result = await downloadResumable.downloadAsync();

        if (!result || result.status !== 200) {
            throw new Error(`Server returned status ${result?.status}`);
        }

        const downloadedInfo = await FileSystem.getInfoAsync(result.uri);
        const downloadedSize = downloadedInfo.exists && 'size' in downloadedInfo && typeof downloadedInfo.size === 'number'
            ? downloadedInfo.size
            : undefined;
        if (expectedSizeBytes && downloadedSize !== undefined && downloadedSize !== expectedSizeBytes) {
            throw new Error(
                `Download size mismatch for ${book}. Expected: ${expectedSizeBytes}, Got: ${downloadedSize}`,
            );
        }

        reportProgress(100);
        reportProgress(VERIFY_PROGRESS_START);

        const calculatedSHA256 = await hashFileSha256(result.uri, (fraction) => {
            reportProgress(VERIFY_PROGRESS_START + fraction * (EXTRACT_PROGRESS_START - VERIFY_PROGRESS_START - 1));
        });
        const expectedHash = normalizeDigest(expectedSHA256);
        if (calculatedSHA256 !== expectedHash) {
            throw new Error(`Checksum verification failed for ${book}. Expected: ${expectedHash}, Got: ${calculatedSHA256}`);
        }

        reportProgress(EXTRACT_PROGRESS_START);
        await yieldToEventLoop();

        const destination = FileSystem.documentDirectory + `${HYMNAL_FOLDER}/`;
        await unzip(result.uri, destination);

        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        await saveInstalledDigest(book, expectedSHA256);
        if (isUpdate) {
            await clearCache();
        }
        downloadingBooks.delete(book);
        clearDownloadProgress(book, onProgress);

        const completionHandler = installCompletionHandlers.get(book);
        installCompletionHandlers.delete(book);
        if (completionHandler) {
            await completionHandler();
        }

        onFinish?.(true);
    } catch (e) {
        console.error("Extraction Error:", e);
        downloadingBooks.delete(book);
        installCompletionHandlers.delete(book);
        clearDownloadProgress(book, onProgress);
        await FileSystem.deleteAsync(zipFileUri, { idempotent: true }).catch(() => undefined);
        onFinish?.(false);
    }
}

async function removeHymnal(book: string) {
    const hymnalFolder = new Directory(Paths.document, `${HYMNAL_FOLDER}/${book}/`);
    if (hymnalFolder.exists) {
        try {
            hymnalFolder.delete();
        } catch (e) {
            console.log(e);
        }
    }
    await removeInstalledDigest(book);
}

let fileCache: Record<string, string> = {};
async function cachedReadFile(filePath: string): Promise<string> {
    if (fileCache[filePath]) {
        return fileCache[filePath];
    }

    const file = new File(filePath);

    const fileInfo = file.info();
    if (!fileInfo.exists) {
        throw new Error(`File not found at path: ${filePath}`);
    }

    const fileContent = await file.text();
    fileCache[filePath] = fileContent;
    return fileContent;
}

async function getSongData(book: string) {
    const hymnalFolder = new Directory(Paths.document, `${HYMNAL_FOLDER}/${book}/`);
    const songsFile = new File(hymnalFolder, `songs.json`);
    if (!songsFile.exists)
        return undefined;
    const songsContent = await cachedReadFile(songsFile.info().uri || "");
    const songsList = JSON.parse(songsContent) as SongList;
    return songsList;
}

async function getBookIndex(book: string) {
    const hymnalFolder = new Directory(Paths.document, `${HYMNAL_FOLDER}/${book}/`);
    const indexFile = new File(hymnalFolder, `index.json`);
    const indexContent = await cachedReadFile(indexFile.info().uri || "");
    const index = JSON.parse(indexContent) as BookIndex;
    return index;
}

async function clearCache() {
    fileCache = {};
    const cacheFolder = new Directory(Paths.document, `${TEMP_FOLDER}/`);
    if (cacheFolder.exists) {
        cacheFolder.delete();
    }
}

async function deleteAllHymnals() {
    const hymnalFolder = new Directory(Paths.document, `${HYMNAL_FOLDER}/`);
    if (hymnalFolder.exists) {
        hymnalFolder.delete();
    }
    await clearInstalledDigests();
}

export { loadHymnals, downloadHymnal, getSongData, removeHymnal, getBookIndex, clearCache, deleteAllHymnals };