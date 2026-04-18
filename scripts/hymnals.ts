import { BookIndex, BookSummary, SongList } from '@/constants/types';
import { Directory, File, Paths } from 'expo-file-system/next';
import * as FileSystem from 'expo-file-system/legacy';
import { unzip } from 'react-native-zip-archive';
import { hashFolder } from './hash';
import * as Crypto from 'expo-crypto';

const HYMNAL_FOLDER = 'Hymnals'; // folder name in the document directory
const TEMP_FOLDER = 'temp'; // folder name in the document directory
const GITHUB_BASE_URL = `https://raw.githubusercontent.com/ACC-Hymns/books/refs/heads/main`
const downloadingBooks = new Set<string>();
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
        console.log("Hymnal folder does not exist. Creating folder...");
        hymnalFolder.create({ intermediates: true });
    }

    // read all the folders in the hymnal folder and load the summary.json file
    // Process in parallel to avoid blocking
    const books = hymnalFolder.info().files || [];


    const results = await Promise.all(
        books.map(async (book) => {

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
                console.log(`Summary file not found for ${book}.`);
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


async function downloadHymnal(book: string, expectedSHA256: string, onProgress?: (progress: number) => void, onFinish?: (success: boolean) => void) {
    console.log(`Downloading ${book}...`);

    // prevent downloading if already downloading
    if (downloadingBooks.has(book)) {
        console.log(`${book} is already downloading. Skipping download.`);
        return;
    }
    downloadingBooks.add(book);

    // 1. Define clean string paths
    const zipUrl = `https://github.com/ACC-Hymns/books/releases/download/latest/${book}.zip`;

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
                onProgress?.(progress);
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

        // Ensure progress reaches 100% before moving to verification
        onProgress?.(100);
        // // Small delay to ensure UI updates
        // await new Promise(resolve => setTimeout(resolve, 100));
        // onProgress?.(101);

        // // verify the checksum - read file using readableStream
        // const file = new File(result.uri);
        // const stream = file.readableStream();
        
        // // Read all chunks from the stream and accumulate into a single Uint8Array
        // const chunks: Uint8Array[] = [];
        // const reader = stream.getReader();
        
        // try {
        //     while (true) {
        //         const { done, value } = await reader.read();
        //         if (done) break;
        //         if (value) {
        //             chunks.push(value);
        //         }
        //     }
        // } finally {
        //     reader.releaseLock();
        // }
        
        // // Calculate total length and combine all chunks
        // const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        // const bytes = new Uint8Array(totalLength);
        // let offset = 0;
        // for (const chunk of chunks) {
        //     bytes.set(chunk, offset);
        //     offset += chunk.length;
        // }

        // // Crypto.digest returns ArrayBuffer when given bytes, convert to hex string
        // const hashBuffer = await Crypto.digest(
        //     Crypto.CryptoDigestAlgorithm.SHA256,
        //     bytes,
        // );

        // // Convert ArrayBuffer to hex string
        // const hashArray = new Uint8Array(hashBuffer);
        // const calculatedSHA256 = Array.from(hashArray)
        //     .map(byte => byte.toString(16).padStart(2, '0'))
        //     .join('');

        // // Remove the "sha256:" prefix if present in expectedSHA256
        // const expectedHash = expectedSHA256.replace(/^sha256:/, '');
        // if (calculatedSHA256 !== expectedHash) {
        //     throw new Error(`Checksum verification failed for ${book}. Expected: ${expectedHash}, Got: ${calculatedSHA256}`);
        // }

        // Unzip to the hymnals directory
        const destination = FileSystem.documentDirectory + `${HYMNAL_FOLDER}/`;
        let result_unzip = await unzip(result.uri, destination);
        
        // 4. Cleanup
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        downloadingBooks.delete(book);

        console.log(`Successfully installed ${book}`);
        onFinish?.(true);
    } catch (e) {
        console.error("Extraction Error:", e);
        //onFinish?.(false);
    }
}

async function removeHymnal(book: string) {
    const hymnalFolder = new Directory(Paths.document, `${HYMNAL_FOLDER}/${book}/`);
    if (hymnalFolder.exists) {
        try {
            hymnalFolder.delete();
            console.log(`Deleted ${book} hymnal folder.`);
        } catch (e) {
            console.log(e);
        }
    } else {
        console.log(`Hymnal folder for ${book} does not exist.`);
    }
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
        console.log(`Deleted cache folder.`);
    }
}

async function deleteAllHymnals() {
    const hymnalFolder = new Directory(Paths.document, `${HYMNAL_FOLDER}/`);
    if (hymnalFolder.exists) {
        hymnalFolder.delete();
        console.log(`Deleted all hymnals.`);
    }
}

export { loadHymnals, downloadHymnal, getSongData, removeHymnal, getBookIndex, clearCache, deleteAllHymnals };