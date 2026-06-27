import { BroadcastTarget, DisplayCommand } from '@/constants/displayCommand';
import { notifyEcampDisplayRefresh } from '@/scripts/ecampDisplay';
import { toDynamoFields } from '@/scripts/displayCommand';
import { HymnSignConnectionError, publishToHymnSign } from '@/scripts/iotPublish';
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

async function mirrorHymnSignStateToDisplayTable(
    churchId: string,
    command: DisplayCommand,
): Promise<void> {
    if (command.action === 'brightness') {
        return;
    }

    const { song, book, verses, color } = toDynamoFields(command);
    await set(request_client(), churchId, song, book, verses, color);
    notifyEcampDisplayRefresh();
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
                try {
                    await mirrorHymnSignStateToDisplayTable(options.churchId, command);
                } catch (error) {
                    console.warn('Failed to mirror HymnSign state to display table:', error);
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
