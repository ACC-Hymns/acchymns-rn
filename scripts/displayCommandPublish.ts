import { BroadcastTarget, DisplayCommand } from '@/constants/displayCommand';
import { HymnSignConnectionError } from '@/scripts/iotCredentials';
import { toIoTPayload } from '@/scripts/displayCommand';

export type PublishDisplayCommandOptions = {
    churchId: string | null;
    target: BroadcastTarget;
};

export type DisplayCommandPublishers = {
    publishAws: (churchId: string, command: DisplayCommand) => Promise<void>;
    publishHymnSign: (churchId: string, command: DisplayCommand) => Promise<void>;
    applyLocalState?: (command: DisplayCommand) => void;
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

export async function runDisplayCommandPublish(
    command: DisplayCommand,
    options: PublishDisplayCommandOptions,
    publishers: DisplayCommandPublishers,
): Promise<PublishDisplayCommandResult> {
    const result: PublishDisplayCommandResult = {
        aws: 'skipped',
        hymnSign: 'skipped',
        errors: [],
    };

    if (requiresAws(options.target)) {
        if (!options.churchId) {
            result.aws = 'failed';
            result.errors.push(new Error('Church is not configured for AWS broadcast'));
        } else if (command.action === 'brightness') {
            result.aws = 'skipped';
        } else {
            try {
                await publishers.publishAws(options.churchId, command);
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
                const payload = toIoTPayload(command);
                console.log('[ECAMP Subscribe] publishing hymn to IoT', {
                    churchId: options.churchId,
                    payload,
                });

                await publishers.publishHymnSign(options.churchId, command);

                console.log('[ECAMP Subscribe] publish succeeded', {
                    churchId: options.churchId,
                });

                if (payload) {
                    publishers.applyLocalState?.(command);
                }
                result.hymnSign = 'success';
            } catch (error) {
                console.warn('[ECAMP Subscribe] publish failed', {
                    churchId: options.churchId,
                    error: error instanceof Error ? error.message : String(error),
                });
                result.hymnSign = 'failed';
                result.errors.push(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }

    return result;
}
