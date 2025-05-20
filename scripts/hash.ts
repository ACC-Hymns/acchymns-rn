import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

/**
 * Recursively get all file URIs in a folder.
 */
async function getAllFiles(folderUri: string): Promise<string[]> {
  const entries = await FileSystem.readDirectoryAsync(folderUri);
  const files: string[] = [];

  for (const entry of entries) {
    const path = folderUri + entry;
    const info = await FileSystem.getInfoAsync(path);
    if (info.isDirectory) {
      const subFiles = await getAllFiles(path + '/');
      files.push(...subFiles);
    } else {
      files.push(path);
    }
  }

  return files;
}

/**
 * Calculate the hash of a folder's content.
 */
export async function hashFolder(folderUri: string): Promise<string> {
  const fileUris = await getAllFiles(folderUri);
  fileUris.sort(); // Sort to maintain consistency

  let combined = '';
  for (const uri of fileUris) {
    const content = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    combined += uri + content; // include uri for uniqueness
  }

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined
  );

  return hash;
}