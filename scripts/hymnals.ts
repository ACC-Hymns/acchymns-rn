import { BookIndex, BookSummary, SongList } from '@/constants/types';
import { Directory, File, Paths } from 'expo-file-system/next';
import { hashFolder } from './hash';

const HYMNAL_FOLDER = 'hymnals'; // folder name in the document directory
const TEMP_FOLDER = 'temp'; // folder name in the document directory
const GITHUB_BASE_URL = `https://raw.githubusercontent.com/ACC-Hymns/books/refs/heads/main`
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
            // if the summary file is not found, purge the book folder
            const bookFolder = new Directory(Paths.document, `${HYMNAL_FOLDER}/${result.book}`);
            if (bookFolder.exists) {
                bookFolder.delete();
                console.log(`Deleted folder for ${result.book}.`);
            } else {
                console.log(`Folder for ${result.book} does not exist.`);
            }
        }
    }
    return BOOK_DATA;
}


async function downloadHymnal(book: string, onProgress?: (progress: number) => void, onFinish?: (success: boolean) => void) {
    const folderUrl = `${GITHUB_BASE_URL}/${book}/`;
    const hymnalFolder = new Directory(Paths.document, `${HYMNAL_FOLDER}`);
    const localFolder = new Directory(Paths.document, `${TEMP_FOLDER}/${book}/`);
    const finalFolder = new Directory(Paths.document, `${HYMNAL_FOLDER}/${book}/`);

    // clear temp folder
    if (localFolder.exists) {
        localFolder.delete();
        console.log(`Deleted temp folder for ${book}.`);
    }

    // Check if the folder already exists
    if (finalFolder.exists) {
        console.log(`Folder for ${book} already exists. Skipping download.`);
        return;
    }

    // Create the local folder if it doesn't exist
    localFolder.create({ intermediates: true });

    // Download metadata files in parallel for better performance
    const summaryUrl = `${folderUrl}summary.json`;
    const signatureURL = `${folderUrl}.signature_v2`;
    const songsUrl = `${folderUrl}songs.json`;
    
    const [summaryFile, signatureFile, songsFile] = await Promise.all([
        File.downloadFileAsync(summaryUrl, localFolder),
        File.downloadFileAsync(signatureURL, localFolder),
        File.downloadFileAsync(songsUrl, localFolder)
    ]);

    if (!summaryFile.exists) {
        throw new Error(`Failed to download summary.json for ${book}`);
    }

    // Parse the summary.json file to get the song count
    const summaryContent = await summaryFile.text();
    const summary = JSON.parse(summaryContent) as BookSummary;

    // Download index.json in parallel if needed (don't wait for it)
    let indexFilePromise: Promise<any> | null = null;
    if (summary.indexAvailable) {
        const indexUrl = `${folderUrl}index.json`;
        indexFilePromise = File.downloadFileAsync(indexUrl, localFolder);
    }

    // Wait for index if it was requested
    if (indexFilePromise) {
        await indexFilePromise;
    }

    // Create songs folder
    const songsFolder = new Directory(localFolder, `songs`);
    songsFolder.create({ intermediates: true });

    // Download all song images
    const songs = await songsFile.text();
    const songsList = JSON.parse(songs) as SongList;

    // Increase chunk size for better parallelization (50-100 concurrent downloads)
    const chunkSize = 50;
    const songNumbers = Object.keys(songsList);
    const totalSongs = songNumbers.length;
    
    // Use atomic counter for thread-safe progress updates
    let downloadedSongs = 0;
    const updateProgress = () => {
        if (onProgress) {
            onProgress((downloadedSongs / totalSongs) * 100);
        }
    };

    for (let i = 0; i < songNumbers.length; i += chunkSize) {
        const chunk = songNumbers.slice(i, i + chunkSize);

        await Promise.allSettled(
            chunk.map(async (songNumber) => {
                try {
                    const songImageUrl = `${folderUrl}songs/${songNumber}.${summary.fileExtension}`;
                    const songFile = new File(songsFolder, `${songNumber}.${summary.fileExtension}`);
                    await File.downloadFileAsync(songImageUrl, songFile);
                    downloadedSongs++;
                    updateProgress();
                } catch (error) {
                    console.error(`Error downloading ${songNumber}.${summary.fileExtension}: ${error}`);
                    // Continue with other downloads even if one fails
                }
            })
        );
        
        // Only log every 10th chunk to reduce console overhead
        if ((i / chunkSize) % 10 === 0) {
            console.log(`Downloaded songs ${i + 1} to ${Math.min(i + chunkSize, songNumbers.length)}`);
        }
    }

    // Move the downloaded files to the hymnal folder
    //finalFolder.create({ intermediates: true });
    localFolder.move(hymnalFolder);
    console.log(`Moved ${book} folder to ${hymnalFolder.info().uri || "ERROR"}`);

    console.log(`Finished downloading ${summary.name.short}.`);
    // Ensure progress reaches 100% before moving to verification
    onProgress?.(100);
    // Small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100));
    onProgress?.(101);
    // verify the download
    const valid = await hashFolder(finalFolder.info().uri || "ERROR");
    onFinish?.(valid);
}

async function removeHymnal(book: string) {
    const hymnalFolder = new Directory(Paths.document, `${HYMNAL_FOLDER}/${book}/`);
    if (hymnalFolder.exists) {
        try {
            hymnalFolder.delete();
            console.log(`Deleted ${book} hymnal folder.`);
        } catch(e) {
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
    if(!songsFile.exists)
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