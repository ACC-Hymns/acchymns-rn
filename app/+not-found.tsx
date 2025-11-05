import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { I18n } from 'i18n-js';
import { translations } from '@/constants/localization';
import { HymnalContext } from '@/constants/context';
import { getLocales } from 'expo-localization';

export default function NotFoundScreen() {
  const context = useContext(HymnalContext);
  const router = useRouter();
  const i18n = new I18n(translations);
  i18n.enableFallback = true;
  i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';
  return (
    <>
      <Stack.Screen options={{ title: i18n.t('oops') }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">{i18n.t('screenDoesntExist')}</ThemedText>
        <Link href="/" style={styles.link}>
          <ThemedText type="link">{i18n.t('goToHomeScreen')}</ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
