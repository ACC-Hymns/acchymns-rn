import { IoTDataPlaneClient, PublishCommand } from '@aws-sdk/client-iot-data-plane';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

import { DisplayCommand } from '@/constants/displayCommand';
import { toIoTPayload } from '@/scripts/displayCommand';

export class HymnSignConnectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'HymnSignConnectionError';
    }
}

function getIotEndpoint(): string {
    const endpoint = process.env.EXPO_PUBLIC_AWS_IOT_ENDPOINT?.trim();
    if (!endpoint) {
        throw new HymnSignConnectionError('AWS IoT endpoint is not configured');
    }
    return endpoint;
}

function iotDataClient(): IoTDataPlaneClient {
    return new IoTDataPlaneClient({
        region: 'us-east-2',
        endpoint: `https://${getIotEndpoint()}`,
        credentials: fromCognitoIdentityPool({
            identityPoolId: 'us-east-2:b4399f56-af48-4544-b368-31e6701d544c',
            clientConfig: { region: 'us-east-2' },
        }),
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
            payload: Buffer.from(JSON.stringify(payload)),
        }),
    );
}

export async function testHymnSignIoTConnection(churchId: string): Promise<void> {
    await publishToHymnSign(churchId, { action: 'clear', clearHymnal: false });
}
