import type { GroupedSunnah } from '@adwam/content/schema';
import { useState } from 'react';
import { Linking, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '../components/controls';
import { Sheet } from '../components/overlays';
import { t } from '../language/messages';
import { appVersion } from '../services/app-version';
import { Prose } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { contentProblemUrl } from './report-url';

export function ReportSheet({ entry, version, open, onClose }: {
  entry: GroupedSunnah; version: string; open: boolean; onClose: () => void;
}) {
  const { palette } = useTheme();
  const [description, setDescription] = useState('');
  const [failed, setFailed] = useState(false);
  const close = () => { setFailed(false); onClose(); };
  const openIssue = async () => {
    try {
      await Linking.openURL(contentProblemUrl(entry, version, appVersion, description));
      setDescription('');
      close();
    } catch {
      setFailed(true);
    }
  };
  return (
    <Sheet open={open} title={t('sheet.report.title')} lead={t('sheet.report.body')} onClose={close}>
      <View style={[styles.metadata, { backgroundColor: palette.paper2 }]}>
        {[entry.title, `${entry.group}.${entry.id}`, t('about.contentVersion', { version }),
          t('about.appVersion', { version: appVersion })].map((line) => (
          <Prose key={line} style={[typography.small, { color: palette.ink2 }]}>{line}</Prose>
        ))}
      </View>
      <TextInput accessibilityLabel={t('sheet.report.placeholder')} value={description} onChangeText={setDescription}
        placeholder={t('sheet.report.placeholder')} placeholderTextColor={palette.ink3} multiline
        style={[typography.body, styles.input, { color: palette.ink, borderColor: palette.hair2, backgroundColor: palette.surface }]} />
      {failed && <Prose accessibilityLiveRegion="polite" style={[typography.caption, { color: palette.rust }]}>{t('detail.linkUnavailable')}</Prose>}
      <Button style={styles.open} label={t('sheet.report.open')} onPress={() => { void openIssue(); }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  metadata: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginVertical: 14, gap: 8, padding: 12, borderRadius: 12 },
  input: { minHeight: 88, borderWidth: 1, borderRadius: 12, padding: 12, textAlignVertical: 'top' },
  open: { marginTop: 12, alignSelf: 'flex-start' },
});
