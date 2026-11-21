import catalog from '@adwam/content/catalog';
import type { todayState } from '@adwam/core';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { TrackerDots } from '../components/calendarDisplay';
import { Card } from '../components/cards';
import { Button, Checkbox, Stepper } from '../components/controls';
import { renderMessage, t, type MessageFormat } from '../language/messages';
import { Prose } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

export type ActiveReminder = ReturnType<typeof todayState>['active'][number];
export type MakeupAction = { kind: 'save'; count: number } | { kind: 'log' };

export function ActiveCard({ reminder, format, onOpen, onTick, onMakeup }: {
  reminder: ActiveReminder; format: MessageFormat; onOpen: () => void;
  onTick: (checked: boolean) => void; onMakeup: (action: MakeupAction) => void;
}) {
  const { palette } = useTheme();
  const { occurrence, body, meta, tick, tracker, done, bell } = reminder;
  if (tracker?.kind === 'makeup') {
    return <MakeupCard count={tracker.count} label={renderMessage(tracker.label, format)}
      shaban={occurrence.hijri.month === 8} onOpen={onOpen} onMakeup={onMakeup} />;
  }

  const weather = occurrence.event && 'weather' in occurrence.event;
  const transliteration = occurrence.definition.inlineDua && catalog.duas.find(({ id }) => id === occurrence.definition.inlineDua)?.tr;
  const names = occurrence.also;
  const hasDetails = Boolean(names?.length || transliteration || weather || tracker);
  return (
    <Card title={occurrence.title} body={body ? renderMessage(body, format) : occurrence.short}
      meta={renderMessage(meta, format)} bell={bell} icon={weather ? 'rainy' : undefined}
      done={done} fasting={tick?.type === 'fast' && tick.done} footerDivider={Boolean(tracker)} onPress={onOpen}
      details={hasDetails && <>
        {!!names?.length && <Prose style={[typography.caption, { color: palette.gold }]}>{t('today.also', { practices: names.join(', ') })}</Prose>}
        {transliteration && <Prose style={[typography.transliteration, styles.dua, { color: palette.ink }]}>
          {transliteration}
        </Prose>}
        {weather && <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL('https://open-meteo.com/').catch(() => {}); }}>
          <Text style={[typography.small, styles.credit, { color: palette.green }]}>{t('about.weather')}</Text>
        </Pressable>}
        {tracker && <TrackerDots total={tracker.total} completed={tracker.count} label={renderMessage(tracker.label, format)} />}
      </>}>
      {tick && <Checkbox label={renderMessage(tick.label, format)} checked={tick.done} onChange={onTick} />}
    </Card>
  );
}

function MakeupCard({ count, label, shaban, onOpen, onMakeup }: {
  count?: number; label: string; shaban: boolean; onOpen: () => void; onMakeup: (action: MakeupAction) => void;
}) {
  const [draft, setDraft] = useState(0);
  if (count === undefined) {
    return <Card title={t('today.makeup.title')} body={t('today.makeup.question')} onPress={onOpen} footerDivider>
      <View style={styles.makeupActions}>
        <Stepper value={draft} onChange={setDraft} />
        <Button label={t('common.save')} variant="text" onPress={() => onMakeup({ kind: 'save', count: draft })} />
      </View>
    </Card>;
  }
  const supporting = shaban ? `${label}. ${t('today.makeup.shabanLastChance')}` : label;
  return <Card title={t('today.makeup.title')} meta={t('today.makeup.left', { count })} body={supporting} onPress={onOpen} footerDivider>
    <Button label={t('today.makeup.log')} icon="check" variant="tonal" small disabled={count <= 0}
      onPress={() => onMakeup({ kind: 'log' })} />
  </Card>;
}

const styles = StyleSheet.create({
  dua: { fontSize: 15.5, lineHeight: 20.9 },
  credit: { textDecorationLine: 'underline' },
  makeupActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
});
