import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { Link } from 'expo-router';

import messages from '@adwam/content/messages/en.json';

import { checkLocalSupabase } from '../services/local-supabase';

export default function HomeScreen() {
  const dark = useColorScheme() === 'dark';
  const [connection, setConnection] = useState<'connected' | 'failed'>();

  useEffect(() => {
    let active = true;
    void checkLocalSupabase()?.then((result) => {
      if (active) setConnection(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={[styles.screen, dark && styles.darkScreen]}>
      <Text
        accessibilityRole="header"
        style={[styles.title, dark && styles.darkTitle]}
      >
        {messages.app.name}
      </Text>
      <Text style={[styles.tagline, dark && styles.darkTitle]}>
        {messages.app.tagline}
      </Text>
      {connection && (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.tagline, dark && styles.darkTitle]}
        >
          {messages.development.supabase[connection]}
        </Text>
      )}
      <Link href="/spike" style={[styles.tagline, dark && styles.darkTitle]}>
        {messages.spike.title}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f7f5ed',
  },
  darkScreen: { backgroundColor: '#171c18' },
  title: {
    color: '#19231e',
    fontSize: 36,
    fontWeight: '600',
    textAlign: 'center',
  },
  darkTitle: { color: '#f2f0e6' },
  tagline: {
    color: '#19231e',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
});
