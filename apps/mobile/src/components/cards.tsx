import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Crescent, Icon, type IconName } from '../icons';
import { t } from '../language/messages';
import { Prose } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { Button, type ButtonProps } from './controls';

export function Card({ title, body, meta, bell, icon, onPress, done, fasting, details, footerDivider, children }: {
  title: string; body?: string; meta?: string; bell?: boolean; icon?: IconName; onPress?: () => void;
  done?: boolean; fasting?: boolean; details?: ReactNode; footerDivider?: boolean; children?: ReactNode;
}) {
  const { palette } = useTheme();
  const surface = done ? palette.doneSurface : fasting ? palette.fastingSurface : palette.surface;
  const mainStyle = [styles.cardContent, children ? styles.cardContentWithFooter : undefined];
  const content = (
    <>
      <View style={styles.cardTitle}>
        {icon && <Icon name={icon} color={palette.green} size={20} />}
        <Text style={[typography.cardTitle, styles.grow, { color: done ? palette.ink2 : palette.ink }]}>{title}</Text>
        {(meta || bell) && <View style={styles.cardMeta}>
          {bell && <Icon name="notifications" label={t('reminders.push')} color={palette.gold} size={16} />}
          {meta && <Text style={[typography.caption, { color: palette.ink2 }]}>{meta}</Text>}
        </View>}
      </View>
      {body && <Prose style={[typography.supporting, { color: palette.ink2 }]}>{body}</Prose>}
    </>
  );
  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: done || fasting ? 'transparent' : palette.hair }]}>
      {onPress ? (
        <Pressable accessibilityRole="button" onPress={onPress} style={mainStyle}>
          {content}
        </Pressable>
      ) : <View style={mainStyle}>{content}</View>}
      {details && <View style={styles.cardDetails}>{details}</View>}
      {children && <View style={[styles.cardFoot, footerDivider && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.hair }]}>{children}</View>}
    </View>
  );
}

export function ListRow({ title, subtitle, icon, end, serif, onPress }: {
  title: string; subtitle?: string; icon?: IconName; end?: ReactNode; serif?: boolean; onPress: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.listRow, { borderColor: palette.hair, backgroundColor: palette.surface }]}>
      {icon && <Icon name={icon} color={palette.green} size={22} />}
      <View style={styles.grow}>
        <Text style={[serif ? styles.serifRowTitle : typography.listTitle, { color: palette.ink }]}>{title}</Text>
        {subtitle && <Text style={[typography.caption, styles.rowSubtitle, { color: palette.ink2 }]}>{subtitle}</Text>}
      </View>
      {end}
      <Icon name="chevron_right" size={20} color={palette.ink3} />
    </Pressable>
  );
}

type RadioProps = { title: string; subtitle?: string; selected: boolean; disabled?: boolean; onPress: () => void };

function RadioChoice({ title, subtitle, selected, disabled, onPress, framed, detail, detailIcon }: RadioProps & {
  framed: boolean; detail?: string; detailIcon?: IconName;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.radioChoice,
        framed ? styles.radioCard : styles.optionRow,
        {
          borderColor: selected && framed ? 'transparent' : palette.hair,
          backgroundColor: framed ? selected ? palette.sage : palette.surface : 'transparent',
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <View style={[styles.radio, { borderColor: selected ? palette.green : palette.hair2 }]}>
        {selected && <View style={[styles.dot, { backgroundColor: palette.green }]} />}
      </View>
      <View style={styles.grow}>
        <Text style={[framed ? typography.cardTitle : typography.listTitle, { color: framed && selected ? palette.onSage : palette.ink }]}>{title}</Text>
        {subtitle && <Text style={[typography.supporting, { color: palette.ink2 }]}>{subtitle}</Text>}
        {detail && <View style={styles.radioDetail}>
          {detailIcon && <Icon name={detailIcon} color={palette.gold} size={16} />}
          <Text style={[typography.sectionAside, styles.radioDetailText, { color: palette.goldText }]}>{detail}</Text>
        </View>}
      </View>
    </Pressable>
  );
}

export function RadioCard(props: RadioProps & { detail?: string; detailIcon?: IconName }) {
  return <RadioChoice {...props} framed />;
}

export function OptionRow(props: RadioProps) {
  return <RadioChoice {...props} framed={false} />;
}

export function Notice({ title, body, icon, actions = [] }: {
  title: string; body: string; icon?: IconName; actions?: readonly ButtonProps[];
}) {
  const { palette } = useTheme();
  return (
    <View style={[styles.notice, { backgroundColor: palette.surface, borderColor: palette.hair }]}>
      {icon && <View style={[styles.noticeIcon, { backgroundColor: palette.goldSoft }]}><Icon name={icon} size={20} color={palette.gold} /></View>}
      <View style={styles.grow}>
        <Text style={[typography.listTitle, { color: palette.ink }]}>{title}</Text>
        <Text style={[typography.supporting, styles.rowSubtitle, { color: palette.ink2 }]}>{body}</Text>
        {!!actions.length && (
          <View style={styles.actions}>
            {actions.map((action) => <Button key={action.label} {...action} variant={action.variant ?? 'outlined'} small />)}
          </View>
        )}
      </View>
    </View>
  );
}

export function Banner({ title, body, onPress }: { title: string; body?: string; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.banner, { backgroundColor: palette.sage }]}>
      <View style={styles.bannerIcon}><Crescent size={24} color={palette.gold} /></View>
      <View style={styles.grow}>
        <Text style={[typography.bannerTitle, { color: palette.onSage }]}>{title}</Text>
        {body && <Text style={[typography.supporting, { color: palette.onSage }]}>{body}</Text>}
      </View>
      <Icon name="chevron_right" size={20} color={palette.onSage} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  radioDetail: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  radioDetailText: { flexShrink: 1, lineHeight: 17 },
  grow: { flex: 1, minWidth: 0 },
  card: { borderWidth: 1, borderRadius: 16 },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 4 },
  cardContent: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  cardContentWithFooter: { paddingBottom: 4 },
  cardDetails: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  cardFoot: { marginHorizontal: 16, paddingBottom: 8, gap: 6 },
  listRow: { minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  serifRowTitle: { ...typography.cardTitle, fontSize: 16, lineHeight: 20 },
  rowSubtitle: { marginTop: 2 },
  radioChoice: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioCard: { padding: 16, borderWidth: 1, borderRadius: 16 },
  optionRow: { paddingVertical: 8, paddingHorizontal: 2, borderTopWidth: StyleSheet.hairlineWidth },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  notice: { padding: 12, borderWidth: 1, borderRadius: 16, flexDirection: 'row', gap: 10 },
  noticeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  banner: { minHeight: 56, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerIcon: { alignSelf: 'flex-start', marginTop: 1 },
});
