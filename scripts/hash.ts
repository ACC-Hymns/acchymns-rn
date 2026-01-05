import { Directory, File, Paths } from 'expo-file-system/next';
import { sha1 } from 'js-sha1';
import { Platform } from 'react-native';

/**
 * Recursively get all file URIs in a folder.
 * Optimized with Set for O(1) extension lookup.
 */
async function getAllFiles(folderUri: string): Promise<string[]> {
    const folder = new Directory(folderUri);
    const files: string[] = [];
    // Use Set for O(1) lookup instead of O(n) array.some()
    const allowedExtensions = new Set(['.png', '.pdf', '.jpg', '.json', '.js']);

    for (const entry of folder.list()) {
        const path = Paths.join(folderUri, entry.name);
        if (entry instanceof Directory) {
            const subFiles = await getAllFiles(path);
            files.push(...subFiles);
        } else {
            // Check extension using Set for O(1) lookup
            const ext = path.substring(path.lastIndexOf('.'));
            if (allowedExtensions.has(ext)) {
                files.push(path);
            }
        }
    }

    return files;
}

// hash individual file - optimized for speed
export async function hashFile(fileUri: string): Promise<string> {
    const file = new File(fileUri);
    const bytes = await file.bytes();

    // js-sha1 is already optimized and fast for binary data
    // Native crypto would require string conversion which adds overhead
    return sha1(bytes);
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
    const fileUris = await getAllFiles(folderUri);
    
    // load .signature file
    const signatureFile = new File(folderUri, Platform.OS === 'ios' ? 'signature_v2.txt' : '.signature_v2');

    if(!signatureFile.exists) {
        console.log('Signature file not found');
        return false;
    }

    const signatureContent = await signatureFile.text();
    const signature = JSON.parse(signatureContent) as BookSignature;

    // Build a map of file signatures for O(1) lookup instead of recursive search
    const signatureMap = new Map<string, BookSignature>();
    const buildSignatureMap = (children: BookSignature[] | undefined, map: Map<string, BookSignature>) => {
        if (!children) return;
        for (const child of children) {
            map.set(child.name, child);
            if (child.children) {
                buildSignatureMap(child.children, map);
            }
        }
    };
    buildSignatureMap(signature.children, signatureMap);

    // Pre-filter JSON files that will be ignored anyway to skip hashing them
    const filesToHash = fileUris.filter(uri => {
        const fileName = uri.split('/').pop()!;
        // Skip JSON files since they're ignored in validation anyway
        return !fileName.endsWith('.json');
    });

    // Use smaller chunk size to avoid blocking JS thread
    // Process in smaller batches with delays to allow UI updates
    const chunkSize = 10;
    for (let i = 0; i < filesToHash.length; i += chunkSize) {
        const chunk = filesToHash.slice(i, i + chunkSize);
        
        // Process chunk in parallel
        const results = await Promise.all(
            chunk.map(async (fileUri) => {
                const fileName = fileUri.split('/').pop()!;
                const fileHash = await hashFile(fileUri);
                
                // O(1) lookup instead of recursive search
                const fileSignature = signatureMap.get(fileName);
                if (!fileSignature) {
                    return { valid: false, fileName };
                }

                // check if the hash matches
                if (fileSignature.hash !== fileHash) {
                    return { valid: false, fileName };
                }
                
                return { valid: true, fileName };
            })
        );
        
        // Check if any file failed validation
        const failed = results.find(r => !r.valid);
        if (failed) {
            console.log(`File ${failed.fileName} failed validation`);
            return false;
        }
        
        // Yield to event loop between chunks to prevent blocking
        // This allows UI updates and animations to continue
        if (i + chunkSize < filesToHash.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    return true;
}