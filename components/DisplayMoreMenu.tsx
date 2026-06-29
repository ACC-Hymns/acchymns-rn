import { InteractionManager, Platform, TouchableOpacity } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as SwiftUI from '@expo/ui/swift-ui';
import { RNHostView } from '@expo/ui/swift-ui';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useDisplayMoreMenu } from '@/hooks/useDisplayMoreMenu';

interface DisplayMoreMenuProps {
    bookId: string;
    songId?: string;
    onReportIssuePress?: () => void;
    tintColor?: string;
}

export function DisplayMoreMenu({
    bookId,
    songId,
    onReportIssuePress,
    tintColor,
}: DisplayMoreMenuProps) {
    const theme = useColorScheme() ?? 'light';
    const {
        i18n,
        isBookmarked,
        nativeMenuKey,
        menuInstanceId,
        toggleBookmark,
        shareSong,
        openReportIssueAfterMenuCloses,
        bumpNativeMenuKey,
        bumpMenuInstanceId,
        bookmarkLabel,
    } = useDisplayMoreMenu({ bookId, songId, onReportIssuePress });

    const iconColor = tintColor ?? (theme === 'light' ? Colors.light.icon : Colors.dark.icon);

    return (
        <>
            {Platform.OS === 'ios' ? (
                <SwiftUI.Host key={nativeMenuKey} matchContents>
                    <SwiftUI.Menu
                        label={
                            <RNHostView matchContents>
                                <Ionicons
                                    name="ellipsis-horizontal"
                                    size={24}
                                    color={iconColor}
                                />
                            </RNHostView>
                        }
                    >
                        <SwiftUI.Button
                            label={bookmarkLabel}
                            systemImage="bookmark"
                            onPress={toggleBookmark}
                        />
                        <SwiftUI.Button
                            label="Share"
                            systemImage="square.and.arrow.up"
                            onPress={shareSong}
                        />
                        <SwiftUI.Button
                            label={i18n.t('reportIssue')}
                            systemImage="exclamationmark.bubble"
                            role="destructive"
                            onPress={openReportIssueAfterMenuCloses}
                        />
                    </SwiftUI.Menu>
                </SwiftUI.Host>
            ) : (
                <DropdownMenu.Root
                    key={nativeMenuKey}
                    onOpenChange={(isOpen) => {
                        if (isOpen) {
                            bumpMenuInstanceId();
                        }
                    }}
                >
                    <DropdownMenu.Trigger>
                    <TouchableOpacity onPress={() => { }} hitSlop={10}>
                            <Ionicons
                                name="ellipsis-horizontal"
                                size={24}
                                color={iconColor}
                            />
                        </TouchableOpacity>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                        <DropdownMenu.Item key={`bookmark-${menuInstanceId}`} onSelect={toggleBookmark}>
                            <DropdownMenu.ItemTitle>
                                {bookmarkLabel}
                            </DropdownMenu.ItemTitle>
                            <DropdownMenu.ItemIcon ios={{ name: 'bookmark' }}>
                                <Ionicons name='bookmark-outline' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                            </DropdownMenu.ItemIcon>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item key={`share-${menuInstanceId}`} onSelect={async () => {
                            try {
                                await shareSong();
                            } finally {
                                InteractionManager.runAfterInteractions(() => {
                                    bumpNativeMenuKey();
                                });
                            }
                        }}>
                            <DropdownMenu.ItemTitle>{i18n.t('share')}</DropdownMenu.ItemTitle>
                            <DropdownMenu.ItemIcon ios={{ name: 'square.and.arrow.up' }}>
                                <Ionicons name='share-outline' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                            </DropdownMenu.ItemIcon>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item key={`report-issue-${menuInstanceId}`} onSelect={openReportIssueAfterMenuCloses} destructive={true} >
                            <DropdownMenu.ItemTitle>{i18n.t('reportIssue')}</DropdownMenu.ItemTitle>
                            <DropdownMenu.ItemIcon ios={{ name: 'exclamationmark.bubble' }}>
                                <Ionicons name='flag-outline' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                            </DropdownMenu.ItemIcon>
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            )}
        </>
    )
}
