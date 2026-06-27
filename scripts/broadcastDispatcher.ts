import { BroadcastTarget, DisplayCommand } from '@/constants/displayCommand';
import { parseEcampCommandPayload } from '@/scripts/ecampDisplay';
import { applyLocalEcampDisplayState } from '@/scripts/ecampDisplaySubscription';
import { HymnSignConnectionError, publishToHymnSign } from '@/scripts/iotPublish';
import { toDynamoFields, toIoTPayload } from '@/scripts/displayCommand';
import { request_client, set } from '@/scripts/broadcast';

export type PublishDisplayCommandOptions = {
    churchId: string | null;
    target: BroadcastTarget;
};

export type PublishDisplayCommandResult = {
    aws: 'skipped' | 'success' | 'failed';
    hymnSign: 'skipped' | 'success' | 'failed';
    hymnSignSkippedReason?: 'bible' | 'not_configured';
    errors: Error[];
};

function requiresAws(target: BroadcastTarget): boolean {
    return target === 'aws' || target === 'both';
}

function requiresHymnSign(target: BroadcastTarget): boolean {
    return target === 'hymnsign' || target === 'both';
}

export async function publishDisplayCommand(
    command: DisplayCommand,
    options: PublishDisplayCommandOptions,
): Promise<PublishDisplayCommandResult> {
    const result: PublishDisplayCommandResult = {
        aws: 'skipped',
        hymnSign: 'skipped',
        errors: [],
    };

    if (requiresAws(options.target)) {
        if (!options.churchId) {
            const error = new Error('Church is not configured for AWS broadcast');
            result.aws = 'failed';
            result.errors.push(error);
        } else if (command.action === 'brightness') {
            result.aws = 'skipped';
        } else {
            try {
                const { song, book, verses, color } = toDynamoFields(command);
                await set(request_client(), options.churchId, song, book, verses, color);
                result.aws = 'success';
            } catch (error) {
                result.aws = 'failed';
                result.errors.push(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }

    if (requiresHymnSign(options.target)) {
        if (command.action === 'bible') {
            result.hymnSign = 'skipped';
            result.hymnSignSkippedReason = 'bible';
        } else if (!options.churchId) {
            result.hymnSign = 'skipped';
            result.hymnSignSkippedReason = 'not_configured';
            result.errors.push(new HymnSignConnectionError('Church is not configured for HymnSign'));
        } else {
            try {
                await publishToHymnSign(options.churchId, command);
                const payload = toIoTPayload(command);
                if (payload) {
                    applyLocalEcampDisplayState(
                        parseEcampCommandPayload(JSON.stringify(payload)),
                    );
                }
                result.hymnSign = 'success';
            } catch (error) {
                result.hymnSign = 'failed';
                result.errors.push(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }

    return result;
}
