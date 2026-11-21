import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '../../language/messages';
import { isTestBuild } from '../../theme/isTestBuild';
import { ArabicText, Prose } from '../../theme/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { colors, type AppearancePreference } from '../../theme/tokens';
import { typography } from '../../theme/typography';

const preferences = ['system', 'light', 'dark'] as const satisfies readonly AppearancePreference[];
const glyph = '\uFDFA';

export default function ThemeGallery() {
  const router = useRouter();
  const { mode, palette, preference, setPreference } = useTheme();
  if (!isTestBuild) return <Redirect href="/" />;
  const modes = [mode, mode === 'dark' ? 'light' : 'dark'] as const;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.control}>
          <Text style={[typography.button, { color: palette.green }]}>{t('common.back')}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={[typography.pageTitle, { color: palette.ink }]}>
          {t('developerTools.themeGallery')}
        </Text>
        <View style={styles.controls}>
          {preferences.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="radio"
              accessibilityState={{ checked: item === preference }}
              onPress={() => setPreference(item)}
              style={[styles.control, { backgroundColor: item === preference ? palette.sage : palette.surface }]}
            >
              <Text style={[typography.button, { color: item === preference ? palette.onSage : palette.ink }]}>
                {t(`settings.${item}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        {modes.map((mode) => {
          const sample = colors[mode];
          return (
            <View key={mode} style={[styles.panel, { backgroundColor: sample.paper, borderColor: sample.hair2 }]}>
              <Text accessibilityRole="header" style={[typography.sectionTitle, { color: sample.green }]}>
                {t(`settings.${mode}`)}
              </Text>
              <Text style={[typography.caption, { color: sample.ink2 }]}>{t('developerTools.gallery.colors')}</Text>
              <View style={styles.swatches}>
                {Object.entries(sample).map(([name, value]) => (
                  <View key={name} style={styles.swatch}>
                    <View style={[styles.chip, { backgroundColor: value, borderColor: sample.hair2 }]} />
                    <Text style={[typography.small, { color: sample.ink }]}>{name}</Text>
                    <Text style={[typography.small, { color: sample.ink2 }]}>{value}</Text>
                  </View>
                ))}
              </View>
              <Text style={[typography.caption, { color: sample.ink2 }]}>{t('developerTools.gallery.type')}</Text>
              {Object.entries(typography).map(([name, style]) => (
                <View key={name} style={[styles.textRow, { borderColor: sample.hair }]}>
                  <Text style={[typography.small, { color: sample.ink2 }]}>{name}</Text>
                  <Text style={[style, { color: sample.ink }]}>
                    {name.startsWith('arabic') ? glyph : t('developerTools.gallery.sample')}
                  </Text>
                </View>
              ))}
              <Prose style={{ color: sample.ink }}>{t('developerTools.gallery.prose', { glyph })}</Prose>
              <ArabicText style={{ color: sample.ink }}>{glyph}</ArabicText>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 16, paddingHorizontal: 20, paddingVertical: 16 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  control: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 20, alignSelf: 'flex-start' },
  panel: { padding: 12, borderWidth: 1, borderRadius: 16, gap: 8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { flexBasis: '45%', flexGrow: 1, gap: 2 },
  chip: { height: 26, borderWidth: 1, borderRadius: 4 },
  textRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 4 },
});
