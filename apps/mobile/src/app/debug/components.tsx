import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner, Card, ListRow, Notice, OptionRow, RadioCard } from '../../components/cards';
import { Button, Checkbox, Chip, Segmented, Stepper, Switch, Tag } from '../../components/controls';
import { t } from '../../language/messages';
import { isTestBuild } from '../../theme/isTestBuild';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';

function Gallery() {
  const router = useRouter();
  const { palette } = useTheme();
  const [level, setLevel] = useState<'inapp' | 'push' | 'off'>('push');
  const [enabled, setEnabled] = useState(true);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(2);
  const reset = () => { setDone(false); setEnabled(true); setCount(2); setLevel('push'); };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Button label={t('common.back')} icon="arrow_back" variant="text" onPress={() => router.back()} />
        <Text accessibilityRole="header" style={[typography.pageTitle, { color: palette.ink }]}>
          {t('developerTools.componentGallery')}
        </Text>
        <Notice
          title={t('today.notice.notifications.title')}
          body={t('today.notice.notifications.body')}
          icon="notifications_off"
          actions={[{ label: t('today.notice.notifications.openSettings'), onPress: () => setEnabled(true) }]}
        />
        <Banner title={t('calendar.month.9')} body={t('developerTools.gallery.sample')} onPress={() => setDone(false)} />
        <Card title={t('developerTools.gallery.sample')} icon="bedtime" onPress={() => setDone(true)} done={done}>
          <Checkbox label={t('common.done')} checked={done} onChange={setDone} />
        </Card>
        <ListRow title={t('settings.notifications')} subtitle={t('settings.notificationsAllowed')} icon="notifications" onPress={() => setEnabled(!enabled)} />
        <Switch label={t('settings.notifications')} checked={enabled} onChange={setEnabled} />
        <Segmented
          label={t('detail.reminderTitle')}
          value={level}
          onChange={setLevel}
          options={[
            { value: 'push', label: t('reminders.push') },
            { value: 'inapp', label: t('reminders.inapp') },
            { value: 'off', label: t('reminders.off') },
          ]}
        />
        <View style={styles.row}>
          <Chip label={t('upcoming.filters.fasts')} selected={enabled} onPress={() => setEnabled(!enabled)} />
          <Tag label={t('upcoming.noFasting')} tone="rust" icon="block" />
          <Tag label={t('today.sinceMaghrib')} tone="gold" />
        </View>
        <Stepper value={count} max={10} onChange={setCount} />
        <RadioCard title={t('reminders.preferred')} subtitle={t('setup.reminders.recommended')} selected={level === 'push'} onPress={() => setLevel('push')} />
        <OptionRow title={t('reminders.inappOnly')} selected={level === 'inapp'} onPress={() => setLevel('inapp')} />
        <Button label={t('common.continue')} onPress={() => setDone(true)} />
        <Button label={t('common.save')} variant="tonal" icon="check" onPress={() => setDone(true)} />
        <Button label={t('common.reset')} variant="outlined" onPress={reset} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ComponentGalleryRoute() {
  return isTestBuild ? <Gallery /> : <Redirect href="/" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
});
