import { fmtClock, type dayLine } from '@adwam/core';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../icons';
import { renderMessage, t, type MessageFormat } from '../language/messages';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

export function DayLine({ timeline, format }: { timeline: ReturnType<typeof dayLine>; format: MessageFormat }) {
  const { palette } = useTheme();
  const position = `${timeline.position * 100}%` as const;
  const caption = renderMessage(timeline.caption, format);
  const anchors = timeline.marks.map((mark) => ({
    ...mark,
    label: renderMessage(mark.label, format),
    time: fmtClock(mark.at, format.timeZone, format.uses24HourClock),
  }));
  const spoken = [t('today.dayLine.accessible'), ...anchors.map(({ label, time }) => `${label} ${time}`), caption].join('. ');
  return (
    <View accessible accessibilityLabel={spoken} role="group" style={styles.dayLine}>
      <View aria-hidden style={styles.track}>
        <View style={[styles.line, { right: 0, backgroundColor: palette.hair2 }]} />
        <View style={[styles.line, { width: position, backgroundColor: palette.green }]} />
        {timeline.marks.map((mark) => {
          const maghrib = mark.name === 'maghrib';
          const color = maghrib ? palette.gold : mark.past ? palette.green : palette.hair2;
          return <View key={mark.name} style={[styles.mark, maghrib && styles.maghrib, {
            left: `${mark.position * 100}%`, borderColor: color, backgroundColor: mark.past ? color : palette.paper,
          }]} />;
        })}
        <View style={[styles.nowRing, { left: position, backgroundColor: `${palette.green}38` }]}>
          <View style={[styles.now, { backgroundColor: palette.green }]} />
        </View>
      </View>
      <View style={styles.anchorLabels}>
        {anchors.map((mark) => (
          <View key={mark.name} style={styles.anchorLabel}>
            <Text style={[typography.prayerLabel, styles.center, { color: mark.name === 'maghrib' ? palette.gold : palette.ink }]}>
              {mark.label}
            </Text>
            <Text style={[typography.prayerTime, styles.center, { color: palette.ink3 }]}>
              {mark.time.replace(' ', '\u202f')}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.caption}>
        <Icon name={timeline.caption.key === 'today.dayLine.beforeFajr' ? 'wb_twilight' : 'bedtime'} size={17} color={palette.gold} />
        <Text style={[typography.caption, styles.captionText, { color: palette.ink2 }]}>{caption}</Text>
      </View>
    </View>
  );
}

export function TrackerDots({ total, completed, label, today }: { total: number; completed: number; label: string; today?: number }) {
  const { palette } = useTheme();
  return (
    <View style={styles.tracker}>
      <View aria-hidden style={styles.dots}>
        {Array.from({ length: total }, (_, index) => (
          <View key={index} style={[styles.dotRing, index === today && { backgroundColor: `${palette.green}38` }]}>
            <View style={[styles.dot, { borderColor: index < completed ? palette.green : palette.gold,
              backgroundColor: index < completed ? palette.green : palette.paper }]} />
          </View>
        ))}
      </View>
      <Text style={[typography.caption, styles.captionText, { color: palette.ink2 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dayLine: { marginTop: 16, paddingHorizontal: 2 },
  track: { height: 14, marginHorizontal: 22 },
  line: { position: 'absolute', left: 0, top: 6, height: 2, borderRadius: 1 },
  mark: { position: 'absolute', top: 3, marginLeft: -4, width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  maghrib: { top: 2, marginLeft: -5, width: 10, height: 10, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  nowRing: { position: 'absolute', top: -4, marginLeft: -11, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  now: { width: 14, height: 14, borderRadius: 7 },
  anchorLabels: { flexDirection: 'row', marginTop: 6 },
  anchorLabel: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  caption: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  captionText: { flexShrink: 1 },
  tracker: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  dots: { flexDirection: 'row' },
  dotRing: { width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5 },
});
