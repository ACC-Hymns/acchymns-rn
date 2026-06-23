import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { fileHash } from '@preeternal/react-native-file-hash';
import { sha256 } from 'js-sha256';
import { Platform } from 'react-native';

const HASH_READ_BUFFER_BYTES = 64 * 1024;

function yieldToEventLoop(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => setTimeout(resolve, 0));
    });
}

async function hashFileSha256Js(
    fileUri: string,
    onProgress?: (fraction: number) => void,
): Promise<string> {
    const hash = sha256.create();
    let processedBytes = 0;

    const legacyFileInfo = await FileSystem.getInfoAsync(fileUri);
    const file = new File(fileUri);
    const fileInfo = file.info();
    const totalBytes = fileInfo.size ?? (legacyFileInfo.exists && 'size' in legacyFileInfo ? legacyFileInfo.size : 0) ?? 0;

    const flushBuffer = async (buffer: Uint8Array, length: number) => {
        if (length <= 0) {
            return;
        }

        hash.update(length === buffer.byteLength ? buffer : buffer.subarray(0, length));
        processedBytes += length;

        if (totalBytes > 0) {
            onProgress?.(Math.min(processedBytes / totalBytes, 1));
        }

        await yieldToEventLoop();
    };

    const stream = file.readableStream();
    const reader = stream.getReader();
    const pending = new Uint8Array(HASH_READ_BUFFER_BYTES);
    let pendingLength = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            if (!value?.byteLength) {
                continue;
            }

            let sourceOffset = 0;
            while (sourceOffset < value.byteLength) {
                const space = HASH_READ_BUFFER_BYTES - pendingLength;
                const copyLength = Math.min(space, value.byteLength - sourceOffset);
                pending.set(value.subarray(sourceOffset, sourceOffset + copyLength), pendingLength);
                pendingLength += copyLength;
                sourceOffset += copyLength;

                if (pendingLength === HASH_READ_BUFFER_BYTES) {
                    await flushBuffer(pending, pendingLength);
                    pendingLength = 0;
                }
            }
        }

        await flushBuffer(pending, pendingLength);
    } finally {
        reader.releaseLock();
    }

    return hash.hex();
}

export async function hashFileSha256(
    fileUri: string,
    onProgress?: (fraction: number) => void,
): Promise<string> {
    if (Platform.OS !== 'web') {
        try {
            onProgress?.(0);
            const digest = await fileHash(fileUri, { algorithm: 'SHA-256' });
            onProgress?.(1);
            return digest;
        } catch (error) {
            console.warn('Native file hash failed, falling back to JS:', error);
        }
    }

    return hashFileSha256Js(fileUri, onProgress);
}
