import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../../icons';
import { t } from '../../language/messages';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';
import { useDeviceReduceMotion } from '../../theme/useDeviceReduceMotion';

const tabs = {
  today: 'today', upcoming: 'format_list_bulleted', settings: 'settings',
} as const satisfies Record<string, IconName>;

export const unstable_settings = { anchor: 'today' };

function TabBar({ state, emitter, navigateToTab, descriptors }: BottomTabBarProps) {
  const { palette } = useTheme();
  const { bottom } = useSafeAreaInsets();
  return (
    <View role="tablist" style={[styles.bar, { paddingBottom: Math.max(8, bottom), backgroundColor: palette.paper2, borderColor: palette.hair }]}>
      {state.routes.map((route, index) => {
        const selected = state.index === index;
        const options = descriptors[route.key]?.options;
        const icon = tabs[route.name as keyof typeof tabs];
        const label = options?.title ?? route.name;
        return (
          <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }}
            style={styles.tab} onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!selected && !event.defaultPrevented) navigateToTab(route.key);
            }}>
            <View style={[styles.pill, selected && { backgroundColor: palette.sage }]}>
              <Icon name={icon} color={selected ? palette.onSage : palette.ink2} filled={selected} />
            </View>
            <Text style={[typography.prayerLabel, selected && styles.selected, { color: selected ? palette.ink : palette.ink2 }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { palette } = useTheme();
  const reduced = useDeviceReduceMotion();
  return (
    <Tabs backBehavior="initialRoute" tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, animation: reduced ? 'none' : 'fade', sceneStyle: { backgroundColor: palette.paper } }}>
      <Tabs.Screen name="today" options={{ title: t('navigation.today') }} />
      <Tabs.Screen name="upcoming" options={{ title: t('navigation.upcoming') }} />
      <Tabs.Screen name="settings" options={{ title: t('navigation.settings') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', minHeight: 78, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  pill: { width: 64, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  selected: { fontFamily: 'SourceSans3_700Bold' },
});
