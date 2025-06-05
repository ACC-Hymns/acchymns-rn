import { BookIndex, BookSummary, SongList } from '@/constants/types';
import * as FileSystem from 'expo-file-system';
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
    if (!FileSystem.documentDirectory) {
        throw new Error("Document directory is not available.");
    }
    const hymnalFolderPath = `${FileSystem.documentDirectory}/${HYMNAL_FOLDER}`;
    const folderExists = await FileSystem.getInfoAsync(hymnalFolderPath);

    if (!folderExists.exists) {
        console.log("Hymnal folder does not exist. Creating folder...");
        await FileSystem.makeDirectoryAsync(hymnalFolderPath, { intermediates: true });
    }

    const folderInfo = await FileSystem.readDirectoryAsync(hymnalFolderPath);
    // read all the folders in the hymnal folder and load the summary.json file
    for (const book of folderInfo) {
        const summaryFilePath = `${hymnalFolderPath}/${book}/summary.json`;
        const summaryFileInfo = await FileSystem.getInfoAsync(summaryFilePath);
        if (summaryFileInfo.exists) {
            const summaryContent = await FileSystem.readAsStringAsync(summaryFilePath);
            const summary = JSON.parse(summaryContent) as BookSummary;
            BOOK_DATA[book] = summary;
        } else {
            console.log(`Summary file not found for ${book}.`);

            // if the summary file is not found, purge the book folder
            const bookFolderPath = `${hymnalFolderPath}/${book}`;
            const bookFolderInfo = await FileSystem.getInfoAsync(bookFolderPath);
            if (bookFolderInfo.exists) {
                await FileSystem.deleteAsync(bookFolderPath, { idempotent: true });
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
    const localFolderPath = `${FileSystem.documentDirectory}/${TEMP_FOLDER}/${book}/`;
    const finalFolderPath = `${FileSystem.documentDirectory}/${HYMNAL_FOLDER}/${book}/`;

    // clear temp folder
    const tempFolderInfo = await FileSystem.getInfoAsync(localFolderPath);
    if (tempFolderInfo.exists) {
        await FileSystem.deleteAsync(localFolderPath, { idempotent: true });
        console.log(`Deleted temp folder for ${book}.`);
    }

    // Check if the folder already exists
    const folderExists = await FileSystem.getInfoAsync(finalFolderPath);
    if (folderExists.exists) {
        console.log(`Folder for ${book} already exists. Skipping download.`);
        return;
    }

    // Create the local folder if it doesn't exist
    await FileSystem.makeDirectoryAsync(localFolderPath, { intermediates: true });

    // Download the summary.json file
    const summaryUrl = `${folderUrl}summary.json`;
    const summaryFilePath = `${localFolderPath}summary.json`;
    await FileSystem.downloadAsync(summaryUrl, summaryFilePath)
        .then(({ uri }) => {
            console.log(`Downloaded summary.json to ${uri}`);
        })
        .catch(error => {
            console.error(`Error downloading summary.json: ${error}`);
        });

    // Parse the summary.json file to get the song count
    const summaryContent = await FileSystem.readAsStringAsync(summaryFilePath);
    const summary = JSON.parse(summaryContent) as BookSummary;

    // Download the .signature file if it exists
    const signatureURL = `${folderUrl}.signature_v2`;
    const signatureFilePath = `${localFolderPath}.signature_v2`;
    await FileSystem.downloadAsync(signatureURL, signatureFilePath)
        .then(({ uri }) => {
            console.log(`Downloaded .signature_v2 to ${uri}`);
        })
        .catch(error => {
            console.error(`Error downloading .signature_v2: ${error}`);
        });

    
    if(summary.indexAvailable) {
        // Download the index.json file if it exists
        const indexUrl = `${folderUrl}index.json`;
        const indexFilePath = `${localFolderPath}index.json`;
        await FileSystem.downloadAsync(indexUrl, indexFilePath)
            .then(({ uri }) => {
                console.log(`Downloaded index.json to ${uri}`);
            })
            .catch(error => {
                console.error(`Error downloading index.json: ${error}`);
            });

    }

    // Download the songs.json file
    const songsUrl = `${folderUrl}songs.json`;
    const songsFilePath = `${localFolderPath}songs.json`;
    await FileSystem.downloadAsync(songsUrl, songsFilePath)
        .then(({ uri }) => {
            console.log(`Downloaded songs.json to ${uri}`);
        })
        .catch(error => {
            console.error(`Error downloading songs.json: ${error}`);
        });

    // Create songs folder
    const songsFolderPath = `${localFolderPath}songs/`;
    await FileSystem.makeDirectoryAsync(songsFolderPath, { intermediates: true });

    // Download all song images
    const songs = await FileSystem.readAsStringAsync(songsFilePath);
    const songsList = JSON.parse(songs) as SongList;

    console.log(songsList);

    const chunkSize = 25;
    const songNumbers = Object.keys(songsList);
    const totalSongs = songNumbers.length;
    let downloadedSongs = 0;

    for (let i = 0; i < songNumbers.length; i += chunkSize) {
        const chunk = songNumbers.slice(i, i + chunkSize);

        await Promise.all(
            chunk.map(async (songNumber) => {
                const songImageUrl = `${folderUrl}songs/${songNumber}.${summary.fileExtension}`;
                const localSongImagePath = `${songsFolderPath}${songNumber}.${summary.fileExtension}`;

                await FileSystem.downloadAsync(songImageUrl, localSongImagePath)
                    .then(({ uri }) => {
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
    await FileSystem.makeDirectoryAsync(finalFolderPath, { intermediates: true });
    await FileSystem.moveAsync({
        from: localFolderPath,
        to: finalFolderPath,
    })
    .then(() => {
        console.log(`Moved ${book} folder to ${finalFolderPath}`);
    })
    .catch(error => {
        console.error(`Error moving ${book} folder: ${error}`);
    });

    console.log(`Finished downloading ${summary.name.short}.`);


    onProgress?.(101);
    // verify the download
    const valid = await hashFolder(finalFolderPath);
    onFinish?.(valid);
}

async function removeHymnal(book: string) {
    const hymnalFolderPath = `${FileSystem.documentDirectory}/${HYMNAL_FOLDER}/${book}/`;
    const folderInfo = await FileSystem.getInfoAsync(hymnalFolderPath);
    if (folderInfo.exists) {
        await FileSystem.deleteAsync(hymnalFolderPath, { idempotent: true });
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

    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
        throw new Error(`File not found at path: ${filePath}`);
    }

    const fileContent = await FileSystem.readAsStringAsync(filePath);
    fileCache[filePath] = fileContent;
    return fileContent;
}

async function getSongData(book: string) {
    const hymnalFolderPath = `${FileSystem.documentDirectory}/${HYMNAL_FOLDER}/${book}/`;
    const songsFilePath = `${hymnalFolderPath}songs.json`;
    const songsContent = await cachedReadFile(songsFilePath);
    const songsList = JSON.parse(songsContent) as SongList;
    return songsList;
}

async function getBookIndex(book: string) {
    const hymnalFolderPath = `${FileSystem.documentDirectory}/${HYMNAL_FOLDER}/${book}/`;
    const indexFilePath = `${hymnalFolderPath}index.json`;
    const indexContent = await cachedReadFile(indexFilePath);
    const index = JSON.parse(indexContent) as BookIndex;
    return index;
}

async function clearCache() {
    fileCache = {};
    const cacheFolderPath = `${FileSystem.documentDirectory}/${TEMP_FOLDER}/`;
    const cacheFolderInfo = await FileSystem.getInfoAsync(cacheFolderPath);
    if (cacheFolderInfo.exists) {
        await FileSystem.deleteAsync(cacheFolderPath, { idempotent: true });
        console.log(`Deleted cache folder.`);
    }
}

async function deleteAllHymnals() {
    const hymnalFolderPath = `${FileSystem.documentDirectory}/${HYMNAL_FOLDER}/`;
    const hymnalFolderInfo = await FileSystem.getInfoAsync(hymnalFolderPath);
    if (hymnalFolderInfo.exists) {
        await FileSystem.deleteAsync(hymnalFolderPath, { idempotent: true });
        console.log(`Deleted all hymnals.`);
    }
}

export { loadHymnals, downloadHymnal, getSongData, removeHymnal, getBookIndex, clearCache, deleteAllHymnals };