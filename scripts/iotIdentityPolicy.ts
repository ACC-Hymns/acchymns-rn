import {
    CognitoIdentityClient,
    GetIdCommand,
} from '@aws-sdk/client-cognito-identity';
import {
    AttachPolicyCommand,
    IoTClient,
} from '@aws-sdk/client-iot';

import {
    COGNITO_IDENTITY_POOL_ID,
    formatIotPublishError,
    getIotCredentialsProvider,
    HymnSignConnectionError,
    IOT_REGION,
} from '@/scripts/iotCredentials';

export const IOT_APP_POLICY_NAME = 'HymnSignAppPublish';

const LOG_PREFIX = '[ECAMP Subscribe]';

let attachPolicyPromise: Promise<void> | null = null;

async function getCognitoIdentityId(): Promise<string> {
    const credentials = await getIotCredentialsProvider()();
    const identityClient = new CognitoIdentityClient({
        region: IOT_REGION,
        credentials,
    });

    const response = await identityClient.send(
        new GetIdCommand({
            IdentityPoolId: COGNITO_IDENTITY_POOL_ID,
        }),
    );

    if (!response.IdentityId) {
        throw new HymnSignConnectionError('Could not resolve Cognito identity for IoT access.');
    }

    return response.IdentityId;
}

export async function ensureIotIdentityPolicyAttached(): Promise<void> {
    if (attachPolicyPromise) {
        console.log(LOG_PREFIX, 'IoT policy attach already in progress');
        return attachPolicyPromise;
    }

    attachPolicyPromise = (async () => {
        console.log(LOG_PREFIX, 'attaching IoT policy', {
            policyName: IOT_APP_POLICY_NAME,
        });

        const credentials = await getIotCredentialsProvider()();
        const identityId = await getCognitoIdentityId();
        const iotClient = new IoTClient({
            region: IOT_REGION,
            credentials,
        });

        console.log(LOG_PREFIX, 'resolved Cognito identity for IoT', {
            identityId,
        });

        try {
            await iotClient.send(
                new AttachPolicyCommand({
                    policyName: IOT_APP_POLICY_NAME,
                    target: identityId,
                }),
            );
            console.log(LOG_PREFIX, 'IoT policy attached', {
                policyName: IOT_APP_POLICY_NAME,
                identityId,
            });
        } catch (error) {
            const errorName = error instanceof Error
                ? (error as Error & { name?: string }).name
                : undefined;

            if (errorName !== 'ResourceAlreadyExistsException') {
                console.warn(LOG_PREFIX, 'IoT policy attach failed', {
                    policyName: IOT_APP_POLICY_NAME,
                    identityId,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }

            console.log(LOG_PREFIX, 'IoT policy already attached', {
                policyName: IOT_APP_POLICY_NAME,
                identityId,
            });
        }
    })();

    try {
        await attachPolicyPromise;
    } catch (error) {
        attachPolicyPromise = null;
        if (error instanceof HymnSignConnectionError) {
            throw error;
        }

        throw new HymnSignConnectionError(formatIotPublishError(error));
    }
}
