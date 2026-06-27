import { IoTDataPlaneClient, PublishCommand } from '@aws-sdk/client-iot-data-plane';

import { DisplayCommand } from '@/constants/displayCommand';
import { toIoTPayload } from '@/scripts/displayCommand';
import {
    ensureIotCredentialsReady,
    formatIotPublishError,
    getIotCredentialsProvider,
    getIotEndpoint,
    HymnSignConnectionError,
    IOT_REGION,
} from '@/scripts/iotCredentials';
import { ensureIotIdentityPolicyAttached } from '@/scripts/iotIdentityPolicy';

export { HymnSignConnectionError } from '@/scripts/iotCredentials';

function iotDataClient(): IoTDataPlaneClient {
    return new IoTDataPlaneClient({
        region: IOT_REGION,
        endpoint: `https://${getIotEndpoint()}`,
        credentials: getIotCredentialsProvider(),
    });
}

export function hymnSignCommandTopic(churchId: string): string {
    return `hymnsign/${churchId}/command`;
}

async function publishPayload(
    churchId: string,
    payload: Record<string, unknown>,
    options?: { retain?: boolean; qos?: 0 | 1 },
): Promise<void> {
    await ensureIotCredentialsReady();
    await ensureIotIdentityPolicyAttached();

    const topic = hymnSignCommandTopic(churchId);
    const client = iotDataClient();

    try {
        await client.send(
            new PublishCommand({
                topic,
                qos: options?.qos ?? 1,
                retain: options?.retain ?? false,
                payload: Buffer.from(JSON.stringify(payload)),
            }),
        );
    } catch (error) {
        throw new HymnSignConnectionError(formatIotPublishError(error));
    }
}

export async function publishToHymnSign(churchId: string, command: DisplayCommand): Promise<void> {
    const payload = toIoTPayload(command);
    if (!payload) {
        return;
    }

    await publishPayload(churchId, payload, { retain: true, qos: 1 });
}

export async function testHymnSignIoTConnection(churchId: string): Promise<void> {
    await publishPayload(churchId, { action: 'ping' }, { retain: false, qos: 0 });
}
