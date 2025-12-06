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
    for (const book of hymnalFolder.info().files || []) {
        const summaryFile = new File(Paths.document, `${HYMNAL_FOLDER}/${book}/summary.json`);
        if (summaryFile.exists) {
            const summaryContent = await summaryFile.text();
            const summary = JSON.parse(summaryContent) as BookSummary;
            BOOK_DATA[book] = summary;
        } else {
            console.log(`Summary file not found for ${book}.`);

            // if the summary file is not found, purge the book folder
            const bookFolder = new Directory(Paths.document, `${HYMNAL_FOLDER}/${book}`);
            if (bookFolder.exists) {
                bookFolder.delete();
                console.log(`Deleted folder for ${book}.`);
            } else {
                console.log(`Folder for ${book} does not exist.`);
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

    // Download the summary.json file
    const summaryUrl = `${folderUrl}summary.json`;
    const summaryFile = await File.downloadFileAsync(summaryUrl, localFolder);
    if (summaryFile.exists) {
        console.log(`Downloaded summary.json to ${summaryFile.uri}`);
    } else {
        console.error(`Error downloading summary.json`);
    }

    // Parse the summary.json file to get the song count
    const summaryContent = await summaryFile.text();
    const summary = JSON.parse(summaryContent) as BookSummary;

    // Download the .signature file if it exists
    const signatureURL = `${folderUrl}.signature_v2`;
    const signatureFile = await File.downloadFileAsync(signatureURL, localFolder);
    if (signatureFile.exists) {
        console.log(`Downloaded .signature_v2 to ${signatureFile.uri}`);
    } else {
        console.error(`Error downloading .signature_v2`);
    }

    if (summary.indexAvailable) {
        // Download the index.json file if it exists
        const indexUrl = `${folderUrl}index.json`;
        const indexFile = await File.downloadFileAsync(indexUrl, localFolder);
        if (indexFile.exists) {
            console.log(`Downloaded index.json to ${indexFile.uri}`);
        } else {
            console.error(`Error downloading index.json`);
        }

    }

    // Download the songs.json file
    const songsUrl = `${folderUrl}songs.json`;
    const songsFile = await File.downloadFileAsync(songsUrl, localFolder);
    if (songsFile.exists) {
        console.log(`Downloaded songs.json to ${songsFile.uri}`);
    } else {
        console.error(`Error downloading songs.json`);
    }

    // Create songs folder
    const songsFolder = new Directory(localFolder, `songs`);
    songsFolder.create({ intermediates: true });

    // Download all song images
    const songs = await songsFile.text();
    const songsList = JSON.parse(songs) as SongList;

    const chunkSize = 25;
    const songNumbers = Object.keys(songsList);
    const totalSongs = songNumbers.length;
    let downloadedSongs = 0;

    for (let i = 0; i < songNumbers.length; i += chunkSize) {
        const chunk = songNumbers.slice(i, i + chunkSize);

        await Promise.all(
            chunk.map(async (songNumber) => {
                const songImageUrl = `${folderUrl}songs/${songNumber}.${summary.fileExtension}`;
                await File.downloadFileAsync(songImageUrl, songsFolder).then(({ uri }) => {
                    downloadedSongs++;
                    if (onProgress) {
                        onProgress((downloadedSongs / totalSongs) * 100);
                    }
                })
                .catch(error => {
                    console.error(`Error downloading ${songNumber}.${summary.fileExtension}: ${error}`);
                });
            })
        );
        console.log(`Downloaded songs ${i + 1} to ${Math.min(i + chunkSize, songNumbers.length)}`);
    }


    // Move the downloaded files to the hymnal folder
    //finalFolder.create({ intermediates: true });
    localFolder.move(hymnalFolder);
    console.log(`Moved ${book} folder to ${hymnalFolder.info().uri || "ERROR"}`);

    console.log(`Finished downloading ${summary.name.short}.`);


    onProgress?.(101);
    // verify the download
    const valid = await hashFolder(finalFolder.info().uri || "ERROR");
    onFinish?.(valid);
}

async function removeHymnal(book: string) {
    const hymnalFolder = new Directory(Paths.document, `${HYMNAL_FOLDER}/${book}/`);
    if (hymnalFolder.exists) {
        hymnalFolder.delete();
        console.log(`Deleted ${book} hymnal folder.`);
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