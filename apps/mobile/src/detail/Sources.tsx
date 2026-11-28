import catalog from '@adwam/content/catalog';
import type { GroupedSunnah, Hadith, OtherEvidence, QuranEvidence } from '@adwam/content/schema';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from '../components/headers';
import { Icon } from '../icons';
import { t } from '../language/messages';
import { ArabicText, Prose } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

const indexById = <Row extends { id: string }>(rows: Row[]) => new Map(rows.map((row) => [row.id, row]));
const hadithById = indexById(catalog.evidence.hadith);
const quranById = indexById(catalog.evidence.quran);
const otherById = indexById(catalog.evidence.other);

export function translationCredit({ translator, site }: { translator: string; site: 'sunnah.com' | 'quran.com' }) {
  const name = site === 'sunnah.com' ? 'Sunnah.com' : 'Quran.com';
  return t('detail.translation', { credit: translator.toLowerCase().includes(site) ? translator : `${translator} · ${name}` });
}

export function duaCredit(evidenceId: string): string | undefined {
  const credit = hadithById.get(evidenceId)?.textSource;
  return credit && translationCredit(credit);
}

export function Sources({ entry, openLink }: { entry: GroupedSunnah; openLink: (url: string) => void }) {
  const { palette } = useTheme();
  if (!entry.evidence.length && !entry.notes?.length) return null;
  return <>
    <SectionHeader title={t('detail.sources')} />
    {entry.notes?.map((note) => (
      <Prose key={note} style={[styles.note, { borderLeftColor: palette.gold, color: palette.ink2 }]}>{note}</Prose>
    ))}
    <View style={styles.rows}>
      {entry.evidence.map((id, index) => {
        const hadith = hadithById.get(id);
        const quran = quranById.get(id);
        const other = otherById.get(id);
        return (
          <View key={id} style={index > 0 && [styles.divider, { borderColor: palette.hair }]}>
            {hadith && <HadithRow hadith={hadith} openLink={openLink} />}
            {quran && <QuranRow quran={quran} openLink={openLink} />}
            {other && <OtherRow source={other} openLink={openLink} />}
          </View>
        );
      })}
    </View>
  </>;
}

function SourceRow({ title, subtitle, onPress, expanded }: {
  title: string; subtitle?: string; onPress?: () => void; expanded?: boolean;
}) {
  const { palette } = useTheme();
  const contents = <>
    <View style={styles.rowText}>
      <Prose style={[typography.supporting, styles.rowTitle, { color: palette.green }]}>{title}</Prose>
      {subtitle && <Prose style={[typography.small, { color: palette.ink2 }]}>{subtitle}</Prose>}
    </View>
    {onPress && <View style={expanded && styles.expanded}>
      <Icon name={expanded === undefined ? 'open_in_new' : 'expand_more'} color={palette.ink3} size={18} />
    </View>}
  </>;
  if (!onPress) return <View style={styles.row}>{contents}</View>;
  return (
    <Pressable accessibilityRole={expanded === undefined ? 'link' : 'button'} accessibilityState={{ expanded }}
      onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      {contents}
    </Pressable>
  );
}

function ExpandableSource({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <>
    <SourceRow title={title} subtitle={subtitle} expanded={open} onPress={() => setOpen((value) => !value)} />
    {open && <View style={styles.excerpt}>{children}</View>}
  </>;
}

function Quotation({ excerpt, credit, narrator }: { excerpt: Hadith['excerpt']; credit: string; narrator?: string }) {
  const { palette } = useTheme();
  const arabic = excerpt.partial ? `${excerpt.ar} […]` : excerpt.ar;
  const english = excerpt.partial ? `${excerpt.en} […]` : excerpt.en;
  return <>
    <ArabicText style={styles.arabic}>{arabic}</ArabicText>
    <Prose selectable>{english}</Prose>
    {narrator && <Text style={[typography.small, { color: palette.ink2 }]}>{t('detail.narrator', { narrator })}</Text>}
    <Text style={[typography.small, { color: palette.ink2 }]}>{credit}</Text>
  </>;
}

function HadithRow({ hadith, openLink }: { hadith: Hadith; openLink: (url: string) => void }) {
  const collection = catalog.collections[hadith.collection];
  const title = `${collection?.short ?? hadith.collection} ${hadith.number}`;
  const url = hadith.url ?? collection?.url.replace('{number}', String(hadith.number));
  const grades = hadith.grading.map(({ grade, by, note }) => [grade, by, note].filter(Boolean).join(' · ')).join('\n');
  return (
    <ExpandableSource title={title} subtitle={grades || undefined}>
      <Quotation excerpt={hadith.excerpt} credit={translationCredit(hadith.textSource)} narrator={hadith.narrator} />
      {url && <SourceRow title={t('detail.openSunnah')} onPress={() => openLink(url)} />}
    </ExpandableSource>
  );
}

function QuranRow({ quran, openLink }: { quran: QuranEvidence; openLink: (url: string) => void }) {
  const reference = quran.ayah === undefined ? quran.surah : `${quran.surah}:${quran.ayah}`;
  const title = quran.label ?? t('detail.quranReference', { reference });
  if (!('excerpt' in quran)) return <SourceRow title={title} onPress={() => openLink(quran.url)} />;
  return (
    <ExpandableSource title={title}>
      <Quotation excerpt={quran.excerpt} credit={translationCredit(quran.textSource)} />
      <SourceRow title={t('detail.openQuran')} onPress={() => openLink(quran.url)} />
    </ExpandableSource>
  );
}

function OtherRow({ source, openLink }: { source: OtherEvidence; openLink: (url: string) => void }) {
  const url = source.url;
  const credit = source.type === 'book' ? `${source.author} · ${source.location}` : source.publisher;
  return <SourceRow title={source.title} subtitle={`${credit}\n${source.summary}`} onPress={url ? () => openLink(url) : undefined} />;
}

const styles = StyleSheet.create({
  note: { borderLeftWidth: 2, paddingVertical: 2, paddingLeft: 14, marginBottom: 8 },
  rows: { marginTop: 4 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 8 },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontFamily: 'SourceSans3_500Medium', fontSize: 15 },
  excerpt: { gap: 8, paddingBottom: 12 },
  arabic: { fontSize: 23, lineHeight: 39 },
  expanded: { transform: [{ rotate: '180deg' }] },
});
