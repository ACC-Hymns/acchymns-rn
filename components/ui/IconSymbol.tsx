// This file is a fallback for using Ionicons on Android and web.
import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolWeight } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING = {
  // See Ionicons here: https://icons.esearxpo.fyi
  // See SF Symbols in the SF Symbols app on Mac.
  'house.fill': 'home',
  'house': 'home-outline',
  'magnifyingglass': 'search',
  'bookmark.fill': 'bookmark',
  'bookmark': 'bookmark-outline',
  'gear': 'settings',
  'chevron.left': 'chevron-back',
  'ellipsis.circle': 'ellipsis-horizontal-circle-outline',
  'ellipsis.circle.fill': 'ellipsis-horizontal-circle',
  'textformat.abc': 'funnel-outline',
  'textformat.123': 'funnel-outline',
  'book': 'book-outline',
  'book.fill': 'book',
  'square.and.arrow.up': 'share-outline',
  'trash': 'trash-outline',
  'plus.circle': 'add-circle-outline',
  'network.slash': 'cloud-offline-outline'
} as Partial<
  Record<
    import('expo-symbols').SymbolViewProps['name'],
    React.ComponentProps<typeof Ionicons>['name']
  >
>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<StyledTextStyle>;
  weight?: SymbolWeight;
}) {
  return <Ionicons color={color} size={size} name={MAPPING[name]} style={style} />;
}
