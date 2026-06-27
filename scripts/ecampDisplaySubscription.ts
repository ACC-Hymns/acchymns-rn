import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import mqtt, { MqttClient } from 'mqtt';

import { ECAMP_CHURCH_ID } from '@/constants/broadcastAuth';
import {
    EcampDisplayState,
    ecampDisplayStatesEqual,
    mergeEcampDisplayState,
    parseEcampDisplayMessage,
} from '@/scripts/ecampDisplay';
import { getIotCredentialsProvider, getIotEndpoint, IOT_REGION } from '@/scripts/iotCredentials';
import { ensureIotIdentityPolicyAttached } from '@/scripts/iotIdentityPolicy';
import { hymnSignCommandTopic } from '@/scripts/iotPublish';

type EcampDisplayListener = (state: EcampDisplayState | null) => void;

let client: MqttClient | null = null;
let connectPromise: Promise<void> | null = null;
let currentState: EcampDisplayState | null = null;
let subscriberCount = 0;
const listeners = new Set<EcampDisplayListener>();

function notifyListeners(state: EcampDisplayState | null) {
    if (ecampDisplayStatesEqual(state, currentState)) {
        return;
    }

    currentState = state;
    listeners.forEach((listener) => listener(state));
}

function applyMessage(payload: string) {
    const message = parseEcampDisplayMessage(payload);
    if (message.kind === 'ignore') {
        return;
    }

    if (message.kind === 'clear') {
        notifyListeners(null);
        return;
    }

    notifyListeners(mergeEcampDisplayState(currentState, message.state));
}

function buildSignedQuery(query: Record<string, string | string[] | undefined>): string {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(query)) {
        if (value === undefined) {
            continue;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
            }
            continue;
        }

        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }

    return parts.join('&');
}

async function createSignedIotWsUrl(endpoint: string): Promise<string> {
    const credentialsProvider = getIotCredentialsProvider();
    const credentials = await credentialsProvider();

    if (!credentials?.accessKeyId || !credentials.secretAccessKey) {
        throw new Error('Missing AWS credentials for IoT MQTT');
    }

    const request = new HttpRequest({
        method: 'GET',
        protocol: 'wss:',
        hostname: endpoint,
        path: '/mqtt',
        headers: {
            host: endpoint,
        },
    });

    const signer = new SignatureV4({
        credentials,
        region: IOT_REGION,
        service: 'iotdevicegateway',
        sha256: Sha256,
    });

    const signed = await signer.presign(request, { expiresIn: 86400 });
    const query: Record<string, string | string[] | undefined> = {};

    for (const [key, value] of Object.entries(signed.query ?? {})) {
        if (value === null || value === undefined) {
            continue;
        }
        query[key] = value;
    }

    return `wss://${endpoint}/mqtt?${buildSignedQuery(query)}`;
}

function attachClientHandlers(nextClient: MqttClient, topic: string) {
    nextClient.on('connect', () => {
        nextClient.subscribe(topic, { qos: 1 }, (error) => {
            if (error) {
                console.warn('Failed to subscribe to ECAMP display topic:', error);
            }
        });
    });

    nextClient.on('message', (_topic, payload) => {
        applyMessage(payload.toString('utf8'));
    });

    nextClient.on('error', (error) => {
        console.warn('ECAMP display MQTT error:', error);
    });
}

async function connectClient(): Promise<void> {
    if (client?.connected) {
        return;
    }

    if (connectPromise) {
        return connectPromise;
    }

    connectPromise = (async () => {
        await ensureIotIdentityPolicyAttached();

        const endpoint = getIotEndpoint();
        const topic = hymnSignCommandTopic(ECAMP_CHURCH_ID);
        const signedUrl = await createSignedIotWsUrl(endpoint);
        const clientId = `acchymns-${Math.random().toString(36).slice(2, 10)}`;

        const nextClient = mqtt.connect(signedUrl, {
            protocol: 'wss',
            clientId,
            reconnectPeriod: 5000,
            connectTimeout: 30_000,
            keepalive: 30,
        });

        attachClientHandlers(nextClient, topic);
        client = nextClient;

        await new Promise<void>((resolve, reject) => {
            const onConnect = () => {
                cleanup();
                resolve();
            };
            const onError = (error: Error) => {
                cleanup();
                reject(error);
            };
            const cleanup = () => {
                nextClient.off('connect', onConnect);
                nextClient.off('error', onError);
            };

            nextClient.once('connect', onConnect);
            nextClient.once('error', onError);
        });
    })();

    try {
        await connectPromise;
    } finally {
        connectPromise = null;
    }
}

function disconnectClient() {
    if (!client) {
        return;
    }

    client.end(true);
    client = null;
}

export function subscribeEcampDisplayState(listener: EcampDisplayListener): () => void {
    listener(currentState);
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export async function startEcampDisplaySubscription(): Promise<() => void> {
    subscriberCount += 1;

    if (subscriberCount === 1) {
        try {
            await connectClient();
        } catch (error) {
            subscriberCount -= 1;
            throw error;
        }
    }

    return () => {
        subscriberCount = Math.max(0, subscriberCount - 1);
        if (subscriberCount === 0) {
            disconnectClient();
        }
    };
}

export function applyLocalEcampDisplayState(state: EcampDisplayState | null) {
    if (state === null) {
        notifyListeners(null);
        return;
    }

    notifyListeners(mergeEcampDisplayState(currentState, state));
}
