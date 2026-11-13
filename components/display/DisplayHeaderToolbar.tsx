import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useDisplayMoreMenu } from '@/hooks/useDisplayMoreMenu';

export type DisplayHeaderToolbarProps = {
    isHeaderVisible: boolean;
    theme: 'light' | 'dark';
    songNotesCount: number;
    hasBroadcasting: boolean;
    bookId: string;
    songId: string;
    onBack: () => void;
    onMusicPress: () => void;
    onBroadcast: () => void;
    onReportIssuePress: () => void;
};

export function DisplayHeaderToolbar({
    isHeaderVisible,
    theme,
    songNotesCount,
    hasBroadcasting,
    bookId,
    songId,
    onBack,
    onMusicPress,
    onBroadcast,
    onReportIssuePress,
}: DisplayHeaderToolbarProps) {
    const iconColor = Colors[theme].icon;
    const hidden = !isHeaderVisible;
    const {
        i18n,
        toggleBookmark,
        shareSong,
        openReportIssueAfterMenuCloses,
        bookmarkLabel,
    } = useDisplayMoreMenu({ bookId, songId, onReportIssuePress });

    return (
        <>
            <Stack.Toolbar placement="left">
                <Stack.Toolbar.Button
                    icon="chevron.left"
                    onPress={onBack}
                    hidden={hidden}
                    tintColor={iconColor}
                />
            </Stack.Toolbar>
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    icon="music.quarternote.3"
                    onPress={onMusicPress}
                    hidden={hidden || songNotesCount === 0}
                    tintColor={iconColor}
                />
                <Stack.Toolbar.Button
                    icon="dot.radiowaves.left.and.right"
                    onPress={onBroadcast}
                    hidden={hidden || !hasBroadcasting}
                    tintColor={iconColor}
                />
                <Stack.Toolbar.Menu icon="ellipsis" hidden={hidden} tintColor={iconColor}>
                    <Stack.Toolbar.MenuAction
                        icon="bookmark"
                        onPress={toggleBookmark}
                    >
                        {bookmarkLabel}
                    </Stack.Toolbar.MenuAction>
                    <Stack.Toolbar.MenuAction
                        icon="square.and.arrow.up"
                        onPress={shareSong}
                    >
                        {i18n.t('share')}
                    </Stack.Toolbar.MenuAction>
                    <Stack.Toolbar.MenuAction
                        icon="exclamationmark.bubble"
                        destructive
                        onPress={openReportIssueAfterMenuCloses}
                    >
                        {i18n.t('reportIssue')}
                    </Stack.Toolbar.MenuAction>
                </Stack.Toolbar.Menu>
            </Stack.Toolbar>
        </>
    );
}
