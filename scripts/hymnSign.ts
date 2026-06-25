import {
    DisplayCommand,
    HYMNSIGN_CONNECTION_TIMEOUT_MS,
} from '@/constants/displayCommand';
import { HymnSignWireMessage, toHymnSignMessages } from '@/scripts/displayCommand';

export class HymnSignConnectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'HymnSignConnectionError';
    }
}

function hymnSignWebSocketUrl(host: string, port: number): string {
    const trimmedHost = host.trim();
    if (!trimmedHost) {
        throw new HymnSignConnectionError('HymnSign IP address is not configured');
    }

    const hasScheme = trimmedHost.startsWith('ws://') || trimmedHost.startsWith('wss://');
    if (hasScheme) {
        return `${trimmedHost.replace(/\/$/, '')}/ws`;
    }

    return `ws://${trimmedHost}:${port}/ws`;
}

export async function sendHymnSignMessages(
    host: string,
    port: number,
    messages: HymnSignWireMessage[],
): Promise<void> {
    if (messages.length === 0) {
        return;
    }

    const url = hymnSignWebSocketUrl(host, port);

    await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(url);
        let settled = false;
        let messageIndex = 0;

        const finish = (error?: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeoutId);

            try {
                socket.close();
            } catch {
                // ignore close errors
            }

            if (error) {
                reject(error);
                return;
            }

            resolve();
        };

        const timeoutId = setTimeout(() => {
            finish(new HymnSignConnectionError(`Could not reach HymnSign at ${host}`));
        }, HYMNSIGN_CONNECTION_TIMEOUT_MS);

        const sendNext = () => {
            if (messageIndex >= messages.length) {
                finish();
                return;
            }

            socket.send(JSON.stringify(messages[messageIndex]));
            messageIndex += 1;

            if (messageIndex >= messages.length) {
                finish();
            }
        };

        socket.onopen = () => {
            sendNext();
        };

        socket.onerror = () => {
            finish(new HymnSignConnectionError(`Could not reach HymnSign at ${host}`));
        };

        socket.onclose = (event) => {
            if (!settled && event.code !== 1000) {
                finish(new HymnSignConnectionError(`HymnSign connection closed (${event.code})`));
            }
        };
    });
}

export async function sendToHymnSign(
    host: string,
    port: number,
    command: DisplayCommand,
): Promise<void> {
    const messages = toHymnSignMessages(command);
    await sendHymnSignMessages(host, port, messages);
}

export async function testHymnSignConnection(host: string, port: number): Promise<void> {
    const url = hymnSignWebSocketUrl(host, port);

    await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(url);
        let settled = false;

        const finish = (error?: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeoutId);

            try {
                socket.close();
            } catch {
                // ignore close errors
            }

            if (error) {
                reject(error);
                return;
            }

            resolve();
        };

        const timeoutId = setTimeout(() => {
            finish(new HymnSignConnectionError(`Could not reach HymnSign at ${host}`));
        }, HYMNSIGN_CONNECTION_TIMEOUT_MS);

        socket.onopen = () => {
            finish();
        };

        socket.onerror = () => {
            finish(new HymnSignConnectionError(`Could not reach HymnSign at ${host}`));
        };
    });
}
