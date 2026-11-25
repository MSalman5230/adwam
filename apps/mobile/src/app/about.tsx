import catalog from '@adwam/content/catalog';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { SectionHeader } from '../components/headers';
import { Subpage } from '../components/Subpage';
import { Crescent, Icon } from '../icons';
import { t } from '../language/messages';
import { appVersion } from '../services/app-version';
import { Prose } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { brandCrescent } from '../theme/tokens';
import { typography } from '../theme/typography';

const credits = [
  { label: 'about.weather', url: 'https://open-meteo.com/' },
  { label: 'about.weatherLicense', url: 'https://creativecommons.org/licenses/by/4.0/' },
  { label: 'about.cities', url: 'https://www.geonames.org/' },
  { label: 'about.sunnah', url: 'https://sunnah.com/' },
  { label: 'about.quran', url: 'https://quran.com/' },
] as const;

const privacyNoticeUrl ='https://msalman5230.github.io/adwam/privacy/';

export default function AboutScreen() {
  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('about.title'), t('detail.linkUnavailable'));
    }
  };

  return <Subpage title={t('about.title')} heading={<AboutHeading />}>
    <SectionHeader title={t('about.sources')} />
    <Prose>{t('about.sourcesBody')}</Prose>
    <SectionHeader title={t('about.privacy')} />
    <Prose>{t('about.privacyBody')}</Prose>
    <Prose style={styles.paragraph}>{t('about.diagnostics')}</Prose>
    <View style={styles.paragraph}>
      <ExternalLink label={t('about.privacyNotice')} onPress={() => { void open(privacyNoticeUrl); }} />
    </View>
    <SectionHeader title={t('about.credits')} />
    {credits.map(({ label, url }) => <ExternalLink key={label} label={t(label)} onPress={() => { void open(url); }} />)}
    <SectionHeader title={t('about.sourceCode')} />
    <ExternalLink label={t('about.repository')} onPress={() => { void open('https://github.com/MSalman5230/adwam'); }} />
    <ExternalLink label={t('about.license')} onPress={() => { void open('https://github.com/MSalman5230/adwam/blob/master/LICENSE'); }} />
  </Subpage>;
}

function AboutHeading() {
  const { palette } = useTheme();
  const versions = [t('about.appVersion', { version: appVersion }), t('about.contentVersion', { version: catalog.version })];
  return <View style={[styles.heading, { borderColor: palette.goldLine }]}>
    <View style={[styles.mark, { backgroundColor: palette.green }]}><Crescent color={brandCrescent} size={38} /></View>
    <Prose accessibilityRole="header" style={[typography.detailTitle, styles.name]}>{t('app.name')}</Prose>
    <Prose style={[typography.detailSubtitle, styles.tagline, { color: palette.ink2 }]}>{t('app.tagline')}</Prose>
    <View style={styles.versions}>
      {versions.map((version) => <Prose key={version}
        style={[typography.prayerLabel, styles.version, { backgroundColor: palette.paper2, color: palette.ink2 }]}>{version}</Prose>)}
    </View>
  </View>;
}

function ExternalLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { palette } = useTheme();
  return <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [styles.link, { borderColor: palette.hair, opacity: pressed ? 0.7 : 1 }]}>
    <Prose style={[typography.supporting, styles.linkTitle, { color: palette.green }]}>{label}</Prose>
    <Icon name="open_in_new" size={18} color={palette.ink3} />
  </Pressable>;
}

const styles = StyleSheet.create({
  heading: { alignItems: 'center', paddingTop: 12, paddingBottom: 22, borderBottomWidth: StyleSheet.hairlineWidth },
  mark: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  name: { marginTop: 14 },
  tagline: { textAlign: 'center', marginTop: 4, maxWidth: 280 },
  versions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 12 },
  version: { borderRadius: 8, overflow: 'hidden', paddingVertical: 5, paddingHorizontal: 9 },
  paragraph: { marginTop: 12 },
  link: { minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkTitle: { flex: 1, paddingVertical: 6 },
});
