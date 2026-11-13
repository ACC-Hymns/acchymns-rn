import { DisplayCommand } from '@/constants/displayCommand';
import { parseEcampCommandPayload } from '@/scripts/ecampDisplay';
import { applyLocalEcampDisplayState } from '@/scripts/ecampDisplaySubscription';
import { publishToHymnSign } from '@/scripts/iotPublish';
import { toDynamoFields, toIoTPayload } from '@/scripts/displayCommand';
import { request_client, set } from '@/scripts/broadcast';
import {
    DisplayCommandPublishers,
    PublishDisplayCommandOptions,
    PublishDisplayCommandResult,
    runDisplayCommandPublish,
} from '@/scripts/displayCommandPublish';

export type {
    DisplayCommandPublishers,
    PublishDisplayCommandOptions,
    PublishDisplayCommandResult,
};

async function publishAws(churchId: string, command: DisplayCommand) {
    const { song, book, verses, color } = toDynamoFields(command);
    await set(request_client(), churchId, song, book, verses, color);
}

function applyLocalState(command: DisplayCommand) {
    const payload = toIoTPayload(command);
    if (!payload) {
        return;
    }

    applyLocalEcampDisplayState(parseEcampCommandPayload(JSON.stringify(payload)));
}

const defaultPublishers: DisplayCommandPublishers = {
    publishAws,
    publishHymnSign: publishToHymnSign,
    applyLocalState,
};

export async function publishDisplayCommand(
    command: DisplayCommand,
    options: PublishDisplayCommandOptions,
    publishers: DisplayCommandPublishers = defaultPublishers,
): Promise<PublishDisplayCommandResult> {
    return runDisplayCommandPublish(command, options, {
        ...defaultPublishers,
        ...publishers,
    });
}
