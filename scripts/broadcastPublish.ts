import { Alert } from 'react-native';
import { BroadcastTarget } from '@/constants/displayCommand';
import {
    getBroadcastTargetForChurch,
    getHymnSignHostForChurch,
    getHymnSignPortForChurch,
} from '@/constants/broadcastAuth';
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
        hymnSignHost: getHymnSignHostForChurch(churchId, context?.hymnSignHost),
        hymnSignPort: getHymnSignPortForChurch(context?.hymnSignPort),
    };
}

export function canPublishBroadcast(context: HymnalContextType | undefined): boolean {
    if (!context?.broadcastingChurch) {
        return false;
    }

    const target = getBroadcastTargetForChurch(context.broadcastingChurch);

    if (target === 'hymnsign' && !getHymnSignHostForChurch(context.broadcastingChurch, context.hymnSignHost)?.trim()) {
        return false;
    }

    return true;
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
