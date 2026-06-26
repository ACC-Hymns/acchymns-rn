import { Alert } from 'react-native';
import { BroadcastTarget } from '@/constants/displayCommand';
import { getBroadcastTargetForChurch } from '@/constants/broadcastAuth';
import { HymnalContextType } from '@/constants/context';
import {
    publishDisplayCommand,
    PublishDisplayCommandResult,
} from '@/scripts/broadcastDispatcher';
import { DisplayCommand } from '@/constants/displayCommand';

type TranslateFn = (key: string, options?: Record<string, string | number>) => string;

export function getBroadcastPublishOptions(context: HymnalContextType | undefined) {
    const churchId = context?.broadcastingChurch ?? null;
    const target = getBroadcastTargetForChurch(churchId);

    return {
        churchId,
        target,
    };
}

export function canPublishBroadcast(context: HymnalContextType | undefined): boolean {
    return Boolean(context?.broadcastingChurch);
}

export function reportBroadcastResult(
    result: PublishDisplayCommandResult,
    i18n: { t: TranslateFn },
    target: BroadcastTarget,
) {
    if (result.hymnSignSkippedReason === 'bible' && (target === 'hymnsign' || target === 'both')) {
        Alert.alert(i18n.t('broadcastBibleHymnSignSkipped'));
    }

    const failures = result.errors;
    if (failures.length === 0) {
        return;
    }

    const message = failures.map((error) => error.message).join('\n');
    Alert.alert(i18n.t('broadcastFailed'), message);
}

export async function publishFromContext(
    context: HymnalContextType | undefined,
    command: DisplayCommand,
    i18n: { t: TranslateFn },
): Promise<PublishDisplayCommandResult> {
    const options = getBroadcastPublishOptions(context);
    const result = await publishDisplayCommand(command, options);
    reportBroadcastResult(result, i18n, options.target);
    return result;
}
