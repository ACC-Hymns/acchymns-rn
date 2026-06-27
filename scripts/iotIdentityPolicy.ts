import {
    CognitoIdentityClient,
    GetIdCommand,
} from '@aws-sdk/client-cognito-identity';
import {
    AttachPolicyCommand,
    IoTClient,
    ListAttachedPoliciesCommand,
} from '@aws-sdk/client-iot';

import {
    COGNITO_IDENTITY_POOL_ID,
    formatIotPublishError,
    getIotCredentialsProvider,
    HymnSignConnectionError,
    IOT_REGION,
} from '@/scripts/iotCredentials';

export const IOT_APP_POLICY_NAME = 'HymnSignAppPublish';

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
        return attachPolicyPromise;
    }

    attachPolicyPromise = (async () => {
        const credentials = await getIotCredentialsProvider()();
        const identityId = await getCognitoIdentityId();
        const iotClient = new IoTClient({
            region: IOT_REGION,
            credentials,
        });

        const attached = await iotClient.send(
            new ListAttachedPoliciesCommand({
                target: identityId,
            }),
        );

        const alreadyAttached = attached.policies?.some(
            (policy) => policy.policyName === IOT_APP_POLICY_NAME,
        );

        if (alreadyAttached) {
            return;
        }

        await iotClient.send(
            new AttachPolicyCommand({
                policyName: IOT_APP_POLICY_NAME,
                target: identityId,
            }),
        );
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
