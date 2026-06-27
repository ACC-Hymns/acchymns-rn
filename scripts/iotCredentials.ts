import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

export const IOT_REGION = 'us-east-2';
export const COGNITO_IDENTITY_POOL_ID = 'us-east-2:b4399f56-af48-4544-b368-31e6701d544c';

export function getIotCredentialsProvider() {
    return fromCognitoIdentityPool({
        identityPoolId: COGNITO_IDENTITY_POOL_ID,
        clientConfig: { region: IOT_REGION },
    });
}

export function getIotEndpoint(): string {
    const endpoint = process.env.EXPO_PUBLIC_AWS_IOT_ENDPOINT?.trim();
    if (!endpoint) {
        throw new Error('AWS IoT endpoint is not configured');
    }
    return endpoint;
}
