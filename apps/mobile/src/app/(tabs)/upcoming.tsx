import catalog from '@adwam/content/catalog';
import { civil, isoAdd, isoParts, type CivilDate, type UpcomingFilter } from '@adwam/core';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { Chip, Tag } from '../../components/controls';
import { Hero, SectionHeader } from '../../components/headers';
import { Crescent, Icon, type IconName } from '../../icons';
import { renderMessage, t, type MessageFormat } from '../../language/messages';
import { useMessageFormat } from '../../language/useMessageFormat';
import { selectReminderState, selectUpcoming } from '../../state/selectors';
import { useClock, useReminderStores } from '../../state/useClock';
import { Prose } from '../../theme/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';
import { agendaItemSubtitle, agendaWeekHeading, agendaWeeks, type AgendaDay, type AgendaWeek, type ItemRow } from '../../upcoming/agenda';

const filters: UpcomingFilter[] = ['all', 'fasts', 'push'];
type OpenItem = (id: string, date: CivilDate) => void;

export default function UpcomingScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<UpcomingFilter>('all');
  const stores = useReminderStores();
  const settings = useStore(stores.settings, ({ value }) => value);
  const trackers = useStore(stores.trackers, ({ value }) => value);
  const cache = useStore(stores.serverCache, ({ value }) => value);
  const now = useClock();
  const format = useMessageFormat(settings.location?.timeZone);
  const state = selectReminderState(settings, trackers, cache, catalog.sunnahs);
  const view = state && selectUpcoming(now, state, filter);
  const weeks = useMemo(() => view?.count ? agendaWeeks(view.rows) : [], [view]);
  const { location } = settings;
  if (!view || !location) return null;
  const today = civil(now, location.timeZone).iso;
  const subtitle = t('upcoming.subtitle', { end: isoAdd(today, 59) });
  const open: OpenItem = (id, date) => router.push({ pathname: '/item/[id]', params: { id, date } });
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: palette.paper }]}>
      <FlatList data={weeks} initialNumToRender={3} keyExtractor={({ start }) => start} contentContainerStyle={styles.body}
        ListHeaderComponent={<>
          <Hero title={t('upcoming.title')} subtitle={subtitle} />
          <View accessibilityLabel={t('upcoming.filtersLabel')} style={styles.filters}>
            {filters.map((name) => <Chip key={name} label={t(`upcoming.filters.${name}`)} selected={filter === name} onPress={() => setFilter(name)} />)}
          </View>
        </>}
        ListEmptyComponent={<View style={[styles.empty, { borderColor: palette.hair2 }]}>
          <Icon name="event" color={palette.gold} />
          <View style={styles.grow}>
            <Prose style={typography.bannerTitle}>{t('upcoming.empty.title')}</Prose>
            <Prose style={[typography.supporting, { color: palette.ink2 }]}>{t('upcoming.empty.body')}</Prose>
          </View>
        </View>}
        renderItem={({ item }) => <Week week={item} today={today} format={format} open={open} />}
        ListFooterComponent={<AgendaFooter city={location.name} count={renderMessage(view.countLabel, format)} />} />
    </SafeAreaView>
  );
}

function Week({ week, today, format, open }: { week: AgendaWeek; today: CivilDate; format: MessageFormat; open: OpenItem }) {
  const { palette } = useTheme();
  const heading = agendaWeekHeading(week.start, today);
  return (
    <View style={styles.week}>
      <SectionHeader {...heading} />
      <View style={[styles.agenda, { borderColor: palette.hair, backgroundColor: palette.surface }]}>
        {week.days.map((row, index) => (
          <View key={`${row.kind}:${row.date}`} style={index > 0 && [styles.divider, { borderColor: palette.hair }]}>
            {row.kind === 'month' ? <View style={[styles.month, { backgroundColor: palette.sage }]}>
              <Crescent size={20} color={palette.gold} />
              <View style={styles.grow}>
                <Prose style={[typography.cardTitle, styles.monthTitle, { color: palette.onSage }]}>{renderMessage(row.title, format)}</Prose>
                <Prose style={[typography.small, { color: palette.onSage }]}>
                  {t('upcoming.monthStartDetail', { eve: isoAdd(row.date, -1), month: row.hijri.month, first: row.date })}
                </Prose>
              </View>
            </View> : <Day day={row} today={today} format={format} open={open} />}
          </View>
        ))}
      </View>
    </View>
  );
}

function Day({ day, today, format, open }: { day: AgendaDay; today: CivilDate; format: MessageFormat; open: OpenItem }) {
  const { palette } = useTheme();
  const current = day.date === today;
  const label = current ? t('timing.relative.standalone.today') : t('upcoming.weekday', { date: day.date });
  return (
    <View style={styles.day}>
      <View style={[styles.date, { borderColor: palette.hair }]}>
        <Text style={[typography.overline, styles.weekday, { color: current ? palette.green : palette.ink2 }]}>{label}</Text>
        <Text style={[typography.sheetTitle, styles.dayNumber, { color: current ? palette.green : palette.ink }]}>{isoParts(day.date).day}</Text>
      </View>
      <View style={styles.grow}>
        {day.items.map((row, index) => (
          <View key={row.occurrence.key} style={index > 0 && [styles.divider, { borderColor: palette.hair }]}>
            <AgendaItem row={row} format={format} open={open} />
          </View>
        ))}
      </View>
    </View>
  );
}

function AgendaItem({ row, format, open }: { row: ItemRow; format: MessageFormat; open: OpenItem }) {
  const { palette } = useTheme();
  const { occurrence } = row;
  const body = <>
    <View style={styles.grow}>
      <Prose style={[typography.cardTitle, styles.itemTitle]}>{row.title}</Prose>
      <Prose style={[typography.small, styles.itemSubtitle, { color: palette.ink2 }]}>{agendaItemSubtitle(row, format)}</Prose>
      {row.tags.length > 0 && <View style={styles.tags}>
        {row.tags.map((tag) => <Tag key={tag.key} label={renderMessage(tag, format)}
          tone={tag.key === 'upcoming.noFasting' ? 'rust' : 'gold'} icon={tag.key === 'upcoming.noFasting' ? 'block' : 'pause_circle'} />)}
      </View>}
    </View>
    {row.bell && <Icon name="notifications" label={t('reminders.push')} size={18} color={palette.gold} />}
  </>;
  if (occurrence.definition.marker && occurrence.definition.card === false) return <View style={styles.item}>{body}</View>;
  return <Pressable accessibilityRole="button" onPress={() => open(occurrence.entry.id, row.date)}
    style={({ pressed }) => [styles.item, pressed && { backgroundColor: palette.paper }]}>{body}</Pressable>;
}

function AgendaFooter({ city, count }: { city: string; count: string }) {
  const { palette } = useTheme();
  const lines: { icon: IconName; text: string }[] = [
    { icon: 'notifications', text: t('upcoming.legend.bell') },
    { icon: 'block', text: t('upcoming.legend.noFasting') },
    { icon: 'rainy', text: t('upcoming.legend.forecast', { city }) },
  ];
  return <View style={[styles.legend, { borderColor: palette.hair }]}>
    {lines.map(({ icon, text }) => <View key={icon} style={styles.legendLine}>
      <Icon name={icon} size={17} color={palette.gold} />
      <Prose style={[typography.small, styles.grow, { color: palette.ink2 }]}>{text}</Prose>
    </View>)}
    <Text accessibilityLiveRegion="polite" style={[typography.caption, styles.count, { color: palette.ink2 }]}>{count}</Text>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 28 },
  filters: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  week: { marginTop: 4 },
  agenda: { overflow: 'hidden', borderWidth: 1, borderRadius: 16 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  day: { flexDirection: 'row' },
  date: { width: 58, alignItems: 'center', paddingTop: 12, paddingBottom: 10, borderRightWidth: StyleSheet.hairlineWidth },
  weekday: { fontSize: 11 },
  dayNumber: { marginTop: 4, fontFamily: 'SourceSerif4_600SemiBold' },
  item: { minHeight: 58, paddingVertical: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemTitle: { fontSize: 15.5, lineHeight: 19.4 },
  itemSubtitle: { marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  month: { paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthTitle: { fontSize: 15, lineHeight: 18 },
  empty: { marginTop: 20, borderStyle: 'dashed', borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12 },
  legend: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 22, paddingTop: 14, gap: 8 },
  legendLine: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  count: { textAlign: 'center', marginTop: 8 },
});
