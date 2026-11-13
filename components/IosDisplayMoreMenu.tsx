import * as SwiftUI from '@expo/ui/swift-ui';
import { RNHostView } from '@expo/ui/swift-ui';
import Ionicons from '@react-native-vector-icons/ionicons';

type IosDisplayMoreMenuProps = {
    nativeMenuKey: number;
    iconColor: string;
    bookmarkLabel: string;
    reportIssueLabel: string;
    onToggleBookmark: () => void;
    onShare: () => void;
    onReportIssue: () => void;
};

export function IosDisplayMoreMenu({
    nativeMenuKey,
    iconColor,
    bookmarkLabel,
    reportIssueLabel,
    onToggleBookmark,
    onShare,
    onReportIssue,
}: IosDisplayMoreMenuProps) {
    return (
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
                    onPress={onToggleBookmark}
                />
                <SwiftUI.Button
                    label="Share"
                    systemImage="square.and.arrow.up"
                    onPress={onShare}
                />
                <SwiftUI.Button
                    label={reportIssueLabel}
                    systemImage="exclamationmark.bubble"
                    role="destructive"
                    onPress={onReportIssue}
                />
            </SwiftUI.Menu>
        </SwiftUI.Host>
    );
}
