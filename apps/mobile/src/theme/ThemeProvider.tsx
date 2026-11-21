import { StatusBar } from 'expo-status-bar';
import { setBackgroundColorAsync } from 'expo-system-ui';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { useStore } from 'zustand';

import { settingsStore } from '../state/native';
import { colors, type AppearancePreference, type ColorMode, type Palette } from './tokens';

type Theme = {
  mode: ColorMode;
  palette: Palette;
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
};

const ThemeContext = createContext<Theme | undefined>(undefined);

function setPreference(appearance: AppearancePreference) {
  settingsStore.getState().update((value) => ({ ...value, appearance }));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemMode = useColorScheme() === 'dark' ? 'dark' : 'light';
  const preference = useStore(settingsStore, ({ value }) => value.appearance);
  const mode = preference === 'system' ? systemMode : preference;
  const palette = colors[mode];

  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'auto' : preference);
  }, [preference]);

  useEffect(() => {
    void setBackgroundColorAsync(palette.paper);
  }, [palette.paper]);

  const value = useMemo(() => ({ mode, palette, preference, setPreference }), [mode, palette, preference]);
  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('ThemeProvider is required');
  return theme;
}
