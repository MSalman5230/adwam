import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions, type ScrollViewProps } from 'react-native';

import { Icon, type IconName } from '../icons';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { useDeviceReduceMotion } from '../theme/useDeviceReduceMotion';

type AppBarAction = { icon: IconName; label: string; onPress: () => void };

function AppBarButton({ icon, label, onPress }: AppBarAction) {
  const { palette } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && { backgroundColor: palette.paper2 }]}>
      <Icon name={icon} color={palette.ink} size={24} />
    </Pressable>
  );
}

export function useAppBarScroll() {
  const [scrolled, setScrolled] = useState(false);
  const onScroll: NonNullable<ScrollViewProps['onScroll']> = ({ nativeEvent }) => setScrolled(nativeEvent.contentOffset.y > 56);
  return { scrolled, onScroll };
}

export function AppBar({ title, scrolled = false, staticTitle = false, start, end = [] }: {
  title: string; scrolled?: boolean; staticTitle?: boolean; start?: AppBarAction; end?: readonly AppBarAction[];
}) {
  const { palette } = useTheme();
  const visible = staticTitle || scrolled;
  const { fontScale } = useWindowDimensions();
  const reduced = useDeviceReduceMotion();
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      progress.setValue(visible ? 1 : 0);
      return;
    }
    const animation = Animated.timing(progress, { toValue: visible ? 1 : 0, duration: 200, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced, visible]);

  return (
    <View style={[styles.appBar, { backgroundColor: palette.paper, borderBottomColor: scrolled ? palette.hair : 'transparent' }]}>
      {start && <AppBarButton {...start} />}
      <Animated.View aria-hidden={!visible} style={[styles.grow, {
        opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }],
      }]}>
        <Text numberOfLines={fontScale >= 1.5 ? undefined : 1} style={[typography.appBar, { color: palette.ink }]}>{title}</Text>
      </Animated.View>
      {end.map((action) => <AppBarButton key={action.label} {...action} />)}
    </View>
  );
}

export function Hero({ title, subtitle, date = false }: { title: string; subtitle?: ReactNode; date?: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.hero, { borderColor: palette.goldLine }]}>
      <Text accessibilityRole="header" style={[date ? typography.hijriTitle : typography.pageTitle, { color: palette.ink }]}>{title}</Text>
      {subtitle && (typeof subtitle === 'string'
        ? <Text style={[styles.heroSubtitle, typography.subtitle, { color: palette.ink2 }]}>{subtitle}</Text>
        : <View style={[styles.heroSubtitle, styles.subtitleRow]}>{subtitle}</View>)}
    </View>
  );
}

export function PageTitle({ title, overline, subtitle, children }: {
  title: string; overline?: string; subtitle?: string; children?: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View style={[styles.pageTitle, { borderColor: palette.goldLine }]}>
      {overline && <Text style={[typography.overline, { color: palette.gold }]}>{overline}</Text>}
      <Text accessibilityRole="header" style={[typography.detailTitle, { color: palette.ink }]}>{title}</Text>
      {subtitle && <Text style={[typography.detailSubtitle, { color: palette.ink2 }]}>{subtitle}</Text>}
      {children}
    </View>
  );
}

export function SectionHeader({ title, aside }: { title: string; aside?: string }) {
  const { palette } = useTheme();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[typography.sectionTitle, styles.wrap, { color: palette.green }]}>{title}</Text>
      <View aria-hidden style={[styles.rule, { backgroundColor: palette.rule }]} />
      {aside && <Text style={[typography.sectionAside, styles.wrap, { color: palette.ink3 }]}>{aside}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  appBar: {
    minHeight: 60, paddingHorizontal: 6, paddingRight: 10, gap: 4,
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth,
  },
  action: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, minWidth: 0 },
  wrap: { flexShrink: 1 },
  hero: { paddingTop: 18, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  heroSubtitle: { marginTop: 7 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pageTitle: { gap: 8, paddingTop: 2, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  section: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 10 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
});
