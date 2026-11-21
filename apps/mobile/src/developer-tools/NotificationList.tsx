import { civil } from '@adwam/core';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '../icons';
import { t, type MessageFormat } from '../language/messages';
import { Prose } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

type Row = { id: string; title: string; at?: number };

export function NotificationList({ title, rows, format }: {
  title: string; rows: readonly Row[]; format: MessageFormat;
}) {
  const { palette } = useTheme();
  const [open, setOpen] = useState(false);
  return <View style={[styles.group, { borderColor: palette.hair, backgroundColor: palette.surface }]}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.header}>
      <Prose style={[typography.cardTitle, styles.title]}>{t('developerTools.notificationCount', { title, count: rows.length })}</Prose>
      <View style={open && styles.open}><Icon name="expand_more" color={palette.ink3} /></View>
    </Pressable>
    {open && (rows.length ? rows.map(({ id, title, at }) => <View key={id} style={[styles.row, { borderColor: palette.hair }]}>
      <Prose style={typography.supporting}>{title}</Prose>
      <Prose style={[typography.caption, { color: palette.ink2 }]}>
        {at === undefined ? id : t('developerTools.notificationAt', { date: civil(at, format.timeZone).iso, time: at }, format)}
      </Prose>
    </View>) : <Prose style={[typography.caption, styles.row, { color: palette.ink2, borderColor: palette.hair }]}>
      {t('notification.empty')}
    </Prose>)}
  </View>;
}

const styles = StyleSheet.create({
  group: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  title: { flex: 1 },
  open: { transform: [{ rotate: '180deg' }] },
  row: { gap: 3, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
});
