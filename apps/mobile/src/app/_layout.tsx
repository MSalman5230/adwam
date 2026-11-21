import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';

import { bundledFonts } from '../theme/fonts';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';

function Navigator() {
  const { palette } = useTheme();
  const [loaded, error] = useFonts(bundledFonts);
  if (!loaded && !error) return null;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.paper } }} />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Navigator />
    </ThemeProvider>
  );
}
