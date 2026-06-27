import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

export class HymnSignConnectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'HymnSignConnectionError';
    }
}

export const IOT_REGION = 'us-east-2';
export const COGNITO_IDENTITY_POOL_ID = 'us-east-2:b4399f56-af48-4544-b368-31e6701d544c';

export function getIotCredentialsProvider() {
    return fromCognitoIdentityPool({
        identityPoolId: COGNITO_IDENTITY_POOL_ID,
        clientConfig: { region: IOT_REGION },
    });
}

export function normalizeIotEndpoint(rawEndpoint: string): string {
    return rawEndpoint
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');
}

export function getIotEndpoint(): string {
    const rawEndpoint = process.env.EXPO_PUBLIC_AWS_IOT_ENDPOINT?.trim();
    if (!rawEndpoint) {
        throw new HymnSignConnectionError(
            'AWS IoT endpoint is not configured. Add EXPO_PUBLIC_AWS_IOT_ENDPOINT to .env and restart the app.',
        );
    }

    return normalizeIotEndpoint(rawEndpoint);
}

export async function ensureIotCredentialsReady(): Promise<void> {
    try {
        const credentials = await getIotCredentialsProvider()();
        if (!credentials?.accessKeyId || !credentials.secretAccessKey) {
            throw new HymnSignConnectionError('Could not obtain AWS credentials from Cognito.');
        }
    } catch (error) {
        if (error instanceof HymnSignConnectionError) {
            throw error;
        }

        throw new HymnSignConnectionError(formatIotPublishError(error));
    }
}

export function formatIotPublishError(error: unknown): string {
    if (error instanceof HymnSignConnectionError) {
        return error.message;
    }

    if (error instanceof Error) {
        const awsError = error as Error & { name?: string; Code?: string };
        const code = awsError.name || awsError.Code;
        if (code && code !== 'Error') {
            return `${code}: ${awsError.message}`;
        }

        return awsError.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    try {
        return JSON.stringify(error);
    } catch {
        return 'Unknown AWS IoT error';
    }
}
