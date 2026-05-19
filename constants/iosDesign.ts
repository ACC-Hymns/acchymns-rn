import Constants from 'expo-constants';
import { Platform } from 'react-native';

function readUIDesignRequiresCompatibilityFlag(): boolean | undefined {
  const expoConfigAny = Constants.expoConfig as any;

  // Preferred: pulled from app.json -> expo.ios.infoPlist
  const fromInfoPlist = expoConfigAny?.ios?.infoPlist?.UIDesignRequiresCompatibility;
  if (typeof fromInfoPlist === 'boolean') return fromInfoPlist;

  // Fallback: mirrored into extra (useful if config shape changes)
  const fromExtra = expoConfigAny?.extra?.uiDesignRequiresCompatibility;
  if (typeof fromExtra === 'boolean') return fromExtra;

  return undefined;
}

export function isIOS26OrNewer(): boolean {
  if (Platform.OS !== 'ios') return false;
  const major = parseInt(String(Platform.Version), 10);
  return Number.isFinite(major) && major >= 26;
}

/**
 * When `UIDesignRequiresCompatibility` is enabled, we treat iOS 26+ devices as
 * opting out of the iOS 26 "liquid glass" UI behavior.
 */
export function isIOS26DesignEnabled(): boolean {
  if (!isIOS26OrNewer()) return false;
  const requiresCompatibility = readUIDesignRequiresCompatibilityFlag() ?? false;
  return !requiresCompatibility;
}

export function isIOS26DesignDisabled(): boolean {
  return Platform.OS === 'ios' && !isIOS26DesignEnabled();
}
