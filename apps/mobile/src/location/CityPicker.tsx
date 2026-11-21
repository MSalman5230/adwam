import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { ListRow } from '../components/cards';
import { Sheet } from '../components/overlays';
import { Icon } from '../icons';
import { t } from '../language/messages';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { searchCities, type NamedCity } from './cities';

function CitySearch({ onPick }: { onPick: (city: NamedCity) => void }) {
  const { palette } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ query: string; cities: NamedCity[] }>();
  useEffect(() => {
    let active = true;
    void searchCities(query).then((cities) => { if (active) setResults({ query, cities }); }, () => {
      if (active) setResults({ query, cities: [] });
    });
    return () => { active = false; };
  }, [query]);
  const cities = results?.query === query ? results.cities : undefined;
  const searchLabel = t('sheet.city.search');

  return (
    <>
      <View style={[styles.search, { backgroundColor: palette.surface, borderColor: palette.hair }]}>
        <Icon name="search" color={palette.ink2} size={22} />
        <TextInput autoCapitalize="none" autoCorrect={false} value={query} onChangeText={setQuery}
          accessibilityLabel={searchLabel} placeholder={searchLabel} placeholderTextColor={palette.ink2}
          style={[typography.body, styles.input, { color: palette.ink }]} />
      </View>
      {!cities ? <ActivityIndicator color={palette.green} /> : cities.map((city) => (
        <ListRow key={city.id} title={city.name} subtitle={city.country} icon="location_on" onPress={() => onPick(city)} />
      ))}
      {cities?.length === 0 && <Text accessibilityLiveRegion="polite" style={[typography.caption, styles.empty, { color: palette.ink2 }]}>
        {t('sheet.city.empty')}
      </Text>}
    </>
  );
}

export function CityPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (city: NamedCity) => void }) {
  return <Sheet open={open} title={t('sheet.city.title')} lead={t('sheet.city.body')} onClose={onClose}>
    {open && <CitySearch onPick={onPick} />}
  </Sheet>;
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
    marginTop: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1,
  },
  input: { minHeight: 46, flex: 1, padding: 0 },
  empty: { paddingVertical: 14 },
});
