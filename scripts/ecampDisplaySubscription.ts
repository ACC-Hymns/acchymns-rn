import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpRequest } from '@smithy/protocol-http';
import { buildQueryString } from '@smithy/querystring-builder';
import { SignatureV4 } from '@smithy/signature-v4';
import { escapeUri } from '@smithy/util-uri-escape';
import mqtt, { MqttClient } from 'mqtt';

import { ECAMP_CHURCH_ID } from '@/constants/broadcastAuth';
import {
    EcampDisplayState,
    ecampDisplayStateKey,
    ecampDisplayStatesEqual,
    mergeEcampDisplayState,
    parseEcampDisplayMessage,
} from '@/scripts/ecampDisplay';
import { getIotCredentialsProvider, getIotEndpoint, IOT_REGION } from '@/scripts/iotCredentials';
import { ensureIotIdentityPolicyAttached } from '@/scripts/iotIdentityPolicy';
import { hymnSignCommandTopic } from '@/scripts/iotPublish';

type EcampDisplayListener = (state: EcampDisplayState | null) => void;

const LOG_PREFIX = '[ECAMP Subscribe]';
const GLOBAL_MQTT_CLIENT_KEY = '__acchymnsEcampMqttClient';

function logSubscribe(message: string, details?: Record<string, unknown>) {
    if (details) {
        console.log(LOG_PREFIX, message, details);
        return;
    }

    console.log(LOG_PREFIX, message);
}

function logSubscribeWarn(message: string, details?: Record<string, unknown>) {
    if (details) {
        console.warn(LOG_PREFIX, message, details);
        return;
    }

    console.warn(LOG_PREFIX, message);
}

let client: MqttClient | null = null;
let connectPromise: Promise<void> | null = null;
let currentState: EcampDisplayState | null = null;
let subscriberCount = 0;
let activeClientId: string | null = null;
let cachedSignedWsUrl = '';
let refreshSignedWsUrlPromise: Promise<string> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<EcampDisplayListener>();

function getGlobalMqttClient(): MqttClient | null {
    const globals = globalThis as unknown as Record<string, MqttClient | undefined>;
    return globals[GLOBAL_MQTT_CLIENT_KEY] ?? null;
}

function setGlobalMqttClient(nextClient: MqttClient | null) {
    const globals = globalThis as unknown as Record<string, MqttClient | undefined>;
    if (nextClient) {
        globals[GLOBAL_MQTT_CLIENT_KEY] = nextClient;
        return;
    }

    delete globals[GLOBAL_MQTT_CLIENT_KEY];
}

function clearReconnectTimer() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
}

function forceEndMqttClient(target: MqttClient | null, reason: string) {
    if (!target) {
        return;
    }

    logSubscribe('force ending MQTT client', {
        reason,
        connected: target.connected,
    });

    try {
        target.removeAllListeners();
        target.end(true);
    } catch (error) {
        logSubscribeWarn('failed to end MQTT client', {
            reason,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

function disposeAllMqttClients(reason: string) {
    clearReconnectTimer();
    forceEndMqttClient(client, reason);
    forceEndMqttClient(getGlobalMqttClient(), reason);
    client = null;
    activeClientId = null;
    setGlobalMqttClient(null);
}

// Dev fast refresh can orphan mqtt.js clients; end any previous global client on load.
disposeAllMqttClients('module init');

function summarizeState(state: EcampDisplayState | null) {
    if (!state) {
        return null;
    }

    return {
        songNumber: state.songNumber,
        bookMedium: state.bookMedium,
        verses: state.verses,
        key: ecampDisplayStateKey(state),
    };
}

function notifyListeners(state: EcampDisplayState | null, source: string) {
    if (ecampDisplayStatesEqual(state, currentState)) {
        logSubscribe('state unchanged, skipping listener notify', {
            source,
            state: summarizeState(state),
        });
        return;
    }

    logSubscribe('notifying listeners', {
        source,
        previous: summarizeState(currentState),
        next: summarizeState(state),
        listenerCount: listeners.size,
    });

    currentState = state;
    listeners.forEach((listener) => {
        try {
            listener(state);
        } catch (error) {
            logSubscribeWarn('listener callback failed', {
                source,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    });
}

function applyMessage(payload: string, source: string) {
    logSubscribe('message received', {
        source,
        payload,
        payloadLength: payload.length,
    });

    const message = parseEcampDisplayMessage(payload);
    logSubscribe('message parsed', {
        source,
        kind: message.kind,
        ...(message.kind === 'song' ? { state: summarizeState(message.state) } : {}),
    });

    if (message.kind === 'ignore') {
        logSubscribe('message ignored', { source });
        return;
    }

    if (message.kind === 'clear') {
        notifyListeners(null, `${source}:clear`);
        return;
    }

    notifyListeners(mergeEcampDisplayState(currentState, message.state), `${source}:song`);
}

async function createSignedIotWsUrl(endpoint: string): Promise<string> {
    logSubscribe('requesting Cognito credentials for MQTT');
    const credentialsProvider = getIotCredentialsProvider();
    const credentials = await credentialsProvider();

    if (!credentials?.accessKeyId || !credentials.secretAccessKey) {
        throw new Error('Missing AWS credentials for IoT MQTT');
    }

    logSubscribe('Cognito credentials ready for MQTT', {
        accessKeyIdPrefix: credentials.accessKeyId.slice(0, 4),
        hasSessionToken: Boolean(credentials.sessionToken),
    });

    const sessionToken = credentials.sessionToken;

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
        credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
        },
        region: IOT_REGION,
        service: 'iotdevicegateway',
        sha256: Sha256,
    });

    const signed = await signer.presign(request, { expiresIn: 86400 });
    const query: Record<string, string | string[]> = {};

    for (const [key, value] of Object.entries(signed.query ?? {})) {
        if (value == null || key === 'X-Amz-Security-Token') {
            continue;
        }

        query[key] = value;
    }

    let url = `wss://${endpoint}/mqtt?${buildQueryString(query)}`;
    if (sessionToken) {
        url += `&X-Amz-Security-Token=${escapeUri(sessionToken)}`;
    }

    return url;
}

async function refreshSignedWsUrl(endpoint: string): Promise<string> {
    if (refreshSignedWsUrlPromise) {
        return refreshSignedWsUrlPromise;
    }

    refreshSignedWsUrlPromise = createSignedIotWsUrl(endpoint)
        .then((url) => {
            cachedSignedWsUrl = url;
            refreshSignedWsUrlPromise = null;
            return url;
        })
        .catch((error) => {
            refreshSignedWsUrlPromise = null;
            throw error;
        });

    return refreshSignedWsUrlPromise;
}

function scheduleReconnect(reason: string) {
    if (subscriberCount === 0 || reconnectTimer) {
        return;
    }

    logSubscribe('scheduling MQTT reconnect', {
        reason,
        clientId: activeClientId,
        subscriberCount,
    });

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (subscriberCount === 0) {
            return;
        }

        void connectClient().catch((error) => {
            logSubscribeWarn('scheduled MQTT reconnect failed', {
                clientId: activeClientId,
                error: error instanceof Error ? error.message : String(error),
            });
            scheduleReconnect('reconnect failed');
        });
    }, 5000);
}

function disposeActiveClient(reason: string) {
    if (!client) {
        return;
    }

    logSubscribe('disposing MQTT client', {
        reason,
        clientId: activeClientId,
        connected: client.connected,
    });

    const closingClient = client;
    client = null;
    activeClientId = null;
    setGlobalMqttClient(null);
    forceEndMqttClient(closingClient, reason);
}

function attachClientHandlers(nextClient: MqttClient, topic: string) {
    nextClient.on('connect', () => {
        logSubscribe('MQTT connect event', {
            clientId: activeClientId,
            connected: nextClient.connected,
        });

        nextClient.subscribe(topic, { qos: 1 }, (error, granted) => {
            if (error) {
                logSubscribeWarn('topic subscribe failed', {
                    topic,
                    error: error.message,
                });
                return;
            }

            logSubscribe('topic subscribe success', {
                topic,
                granted,
            });
        });
    });

    nextClient.on('message', (receivedTopic, payload) => {
        applyMessage(payload.toString('utf8'), `mqtt:${receivedTopic}`);
    });

    nextClient.on('error', (error) => {
        logSubscribeWarn('MQTT error event', {
            clientId: activeClientId,
            error: error.message,
        });
    });

    nextClient.on('close', () => {
        logSubscribe('MQTT connection closed', { clientId: activeClientId });
        if (subscriberCount > 0) {
            scheduleReconnect('connection closed');
        }
    });

    nextClient.on('offline', () => {
        logSubscribeWarn('MQTT client offline', { clientId: activeClientId });
    });

    nextClient.on('end', () => {
        logSubscribe('MQTT client ended', { clientId: activeClientId });
    });
}

async function connectClient(): Promise<void> {
    if (client?.connected) {
        logSubscribe('connect skipped, client already connected', {
            clientId: activeClientId,
            subscriberCount,
        });
        return;
    }

    if (connectPromise) {
        logSubscribe('connect already in progress, awaiting existing promise');
        return connectPromise;
    }

    connectPromise = (async () => {
        logSubscribe('connect starting');

        await ensureIotIdentityPolicyAttached();

        const endpoint = getIotEndpoint();
        const topic = hymnSignCommandTopic(ECAMP_CHURCH_ID);

        logSubscribe('opening MQTT connection', {
            endpoint,
            topic,
            region: IOT_REGION,
            churchId: ECAMP_CHURCH_ID,
        });

        disposeActiveClient('before new connect');

        const clientId = `acchymns-${Math.random().toString(36).slice(2, 10)}`;
        activeClientId = clientId;

        logSubscribe('connecting MQTT client', { clientId });

        await refreshSignedWsUrl(endpoint);

        const baseWsUrl = `wss://${endpoint}/mqtt`;
        const nextClient = mqtt.connect(baseWsUrl, {
            clientId,
            reconnectPeriod: 0,
            connectTimeout: 30_000,
            keepalive: 30,
            transformWsUrl: () => cachedSignedWsUrl || baseWsUrl,
        });

        attachClientHandlers(nextClient, topic);
        client = nextClient;
        setGlobalMqttClient(nextClient);

        await new Promise<void>((resolve, reject) => {
            const onConnect = () => {
                logSubscribe('MQTT initial connect resolved', {
                    clientId,
                    connected: nextClient.connected,
                });
                cleanup();
                resolve();
            };
            const onError = (error: Error) => {
                logSubscribeWarn('MQTT initial connect failed', {
                    clientId,
                    error: error.message,
                });
                cleanup();
                reject(error);
            };
            const onClose = () => {
                logSubscribeWarn('MQTT initial connect closed before ready', {
                    clientId,
                });
                cleanup();
                reject(new Error('MQTT connection closed before connect'));
            };
            const cleanup = () => {
                nextClient.off('connect', onConnect);
                nextClient.off('error', onError);
                nextClient.off('close', onClose);
            };

            nextClient.once('connect', onConnect);
            nextClient.once('error', onError);
            nextClient.once('close', onClose);
        });
    })();

    try {
        await connectPromise;
        logSubscribe('connect finished', {
            clientId: activeClientId,
            connected: client?.connected ?? false,
            subscriberCount,
            currentState: summarizeState(currentState),
        });
    } catch (error) {
        logSubscribeWarn('connect finished with error', {
            error: error instanceof Error ? error.message : String(error),
        });
        disposeActiveClient('connect failed');
        scheduleReconnect('connect failed');
    } finally {
        connectPromise = null;
    }
}

function disconnectClient() {
    if (!client && !getGlobalMqttClient()) {
        logSubscribe('disconnect skipped, no active client');
        return;
    }

    logSubscribe('disconnecting MQTT client', {
        clientId: activeClientId,
        connected: client?.connected ?? false,
        subscriberCount,
    });

    disposeAllMqttClients('subscriber count reached zero');
}

export function subscribeEcampDisplayState(listener: EcampDisplayListener): () => void {
    logSubscribe('listener registered', {
        listenerCountBefore: listeners.size,
        currentState: summarizeState(currentState),
    });

    listener(currentState);
    listeners.add(listener);

    logSubscribe('listener seeded with current state', {
        listenerCount: listeners.size,
        currentState: summarizeState(currentState),
    });

    return () => {
        listeners.delete(listener);
        logSubscribe('listener unregistered', {
            listenerCount: listeners.size,
        });
    };
}

export async function startEcampDisplaySubscription(): Promise<() => void> {
    subscriberCount += 1;

    logSubscribe('start requested', {
        subscriberCount,
        connected: client?.connected ?? false,
        clientId: activeClientId,
    });

    if (subscriberCount === 1) {
        await connectClient();
    } else {
        logSubscribe('start reusing existing connection', {
            subscriberCount,
            connected: client?.connected ?? false,
            clientId: activeClientId,
        });
    }

    return () => {
        subscriberCount = Math.max(0, subscriberCount - 1);
        logSubscribe('release requested', {
            subscriberCount,
            connected: client?.connected ?? false,
            clientId: activeClientId,
        });

        if (subscriberCount === 0) {
            disconnectClient();
        }
    };
}

export function applyLocalEcampDisplayState(state: EcampDisplayState | null) {
    logSubscribe('applyLocalEcampDisplayState', {
        state: summarizeState(state),
    });

    if (state === null) {
        notifyListeners(null, 'local:clear');
        return;
    }

    notifyListeners(mergeEcampDisplayState(currentState, state), 'local:song');
}
