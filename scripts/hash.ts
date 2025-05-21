import * as FileSystem from 'expo-file-system';
import { sha1 } from 'js-sha1';
import * as Crypto from 'expo-crypto';

/**
 * Recursively get all file URIs in a folder.
 */
async function getAllFiles(folderUri: string): Promise<string[]> {
    const entries = await FileSystem.readDirectoryAsync(folderUri);
    const files: string[] = [];
    const allowedExtensions = ['.png', '.pdf', '.jpg', '.json', '.js'];

    for (const entry of entries) {
        const path = folderUri + "/" + entry;
        const info = await FileSystem.getInfoAsync(path);
        if (info.isDirectory) {
            const subFiles = await getAllFiles(path);
            files.push(...subFiles);
        } else {
            if (allowedExtensions.some(ext => path.endsWith(ext))) {
                files.push(path);
            }
        }
    }

    return files;
}

// hash indvidiual file
export async function hashFile(fileUri: string): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    // Convert Base64 to Uint8Array
    const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    // Compute true SHA-1 hash of binary data
    const hash = sha1(binary);

    return hash;
}

type BookSignature = {
    name: string;
    hash: string;
    parent?: BookSignature;
    children?: BookSignature[];
};

/**
 * Calculate the hash of a folder's content.
 */
export async function hashFolder(folderUri: string): Promise<boolean> {
    console.log('Hashing folder:', folderUri);
    const fileUris = await getAllFiles(folderUri);
    
    // load .signature file
    const signatureFileUri = folderUri + '/.signature_v2';
    const signatureFileInfo = await FileSystem.getInfoAsync(signatureFileUri);

    if(!signatureFileInfo.exists) {
        console.log('Signature file not found');
        return false;
    }

    const signatureContent = await FileSystem.readAsStringAsync(signatureFileUri);
    const signature = JSON.parse(signatureContent) as BookSignature;

    // for all BookSignatures
    for (const fileUri of fileUris) {
        const fileName = fileUri.split('/').pop()!;
        const fileHash = await hashFile(fileUri);

        // check if the file is in the signature
        const findFileSignature = (children: BookSignature[] | undefined, fileName: string): BookSignature | undefined => {
            if (!children) return undefined;
            for (const child of children) {
            if (child.name === fileName) {
                return child;
            }
            const foundInChildren = findFileSignature(child.children, fileName);
            if (foundInChildren) {
                return foundInChildren;
            }
            }
            return undefined;
        };

        const fileSignature = findFileSignature(signature.children, fileName);
        if (!fileSignature) {
            console.log(`File ${fileName} not found in signature.`);
            return false;
        }

        // check if the hash matches
        if (fileSignature.hash !== fileHash) {
            console.log(`File ${fileName} hash does not match. Expected ${fileSignature.hash}, got ${fileHash}.`);
            // if type is a json, ignore
            if (fileName.endsWith('.json')) {
                console.log(`Ignoring ${fileName} as it is a JSON file.`);
                continue;
            }
            return false;
        }
    }

    return true;
}