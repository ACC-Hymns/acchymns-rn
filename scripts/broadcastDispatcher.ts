import { BroadcastTarget, DisplayCommand } from '@/constants/displayCommand';
import { toDynamoFields } from '@/scripts/displayCommand';
import { HymnSignConnectionError, sendToHymnSign } from '@/scripts/hymnSign';
import { request_client, set } from '@/scripts/broadcast';

export type PublishDisplayCommandOptions = {
    churchId: string | null;
    target: BroadcastTarget;
    hymnSignHost: string | null;
    hymnSignPort: number;
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
        } else if (!options.hymnSignHost?.trim()) {
            result.hymnSign = 'skipped';
            result.hymnSignSkippedReason = 'not_configured';
            result.errors.push(new HymnSignConnectionError('HymnSign IP address is not configured'));
        } else {
            try {
                await sendToHymnSign(options.hymnSignHost, options.hymnSignPort, command);
                result.hymnSign = 'success';
            } catch (error) {
                result.hymnSign = 'failed';
                result.errors.push(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }

    return result;
}
