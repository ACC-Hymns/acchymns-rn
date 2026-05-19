import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { HymnalContext } from '@/constants/context';
import { useI18n } from '@/hooks/useI18n';

export default function NotFoundScreen() {
  const context = useContext(HymnalContext);
  const router = useRouter();
  const i18n = useI18n();
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
