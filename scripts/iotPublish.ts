import { IoTDataPlaneClient, PublishCommand } from '@aws-sdk/client-iot-data-plane';

import { DisplayCommand } from '@/constants/displayCommand';
import { toIoTPayload } from '@/scripts/displayCommand';
import { getIotCredentialsProvider, getIotEndpoint, IOT_REGION } from '@/scripts/iotCredentials';

export class HymnSignConnectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'HymnSignConnectionError';
    }
}

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

export async function publishToHymnSign(churchId: string, command: DisplayCommand): Promise<void> {
    const payload = toIoTPayload(command);
    if (!payload) {
        return;
    }

    const topic = hymnSignCommandTopic(churchId);
    const client = iotDataClient();

    await client.send(
        new PublishCommand({
            topic,
            qos: 1,
            retain: true,
            payload: Buffer.from(JSON.stringify(payload)),
        }),
    );
}

export async function testHymnSignIoTConnection(churchId: string): Promise<void> {
    await publishToHymnSign(churchId, { action: 'clear', clearHymnal: false });
}
