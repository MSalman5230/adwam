import { expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AboutScreen from '../src/app/about';
import { t } from '../src/language/messages';
import { ThemeProvider } from '../src/theme/ThemeProvider';

jest.mock('expo-router', () => ({ useRouter: () => ({}) }));
jest.mock('@adwam/content/catalog', () => ({ version: '2026.11.21' }), { virtual: true });
jest.mock('../src/services/app-version', () => ({ appVersion: '0.1.0' }));

it('shows the app and content versions, privacy text and external links', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  try {
    await render(<SafeAreaProvider initialMetrics={{
      frame: { x: 0, y: 0, width: 412, height: 915 },
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    }}><ThemeProvider><AboutScreen /></ThemeProvider></SafeAreaProvider>);

    expect(screen.getByText(t('about.appVersion', { version: '0.1.0' }))).toBeOnTheScreen();
    expect(screen.getByText(t('about.contentVersion', { version: '2026.11.21' }))).toBeOnTheScreen();
    for (const section of ['sources', 'privacy', 'credits', 'sourceCode'] as const) {
      expect(screen.getByRole('header', { name: t(`about.${section}`) })).toBeOnTheScreen();
    }
    await fireEvent.press(screen.getByRole('link', { name: t('about.privacyNotice') }));
    expect(openURL).toHaveBeenLastCalledWith('https://msalman5230.github.io/adwam/privacy/');
    await fireEvent.press(screen.getByRole('link', { name: t('about.quran') }));
    expect(openURL).toHaveBeenLastCalledWith('https://quran.com/');
    await fireEvent.press(screen.getByRole('link', { name: t('about.repository') }));
    expect(openURL).toHaveBeenLastCalledWith('https://github.com/MSalman5230/adwam');
    await fireEvent.press(screen.getByRole('link', { name: t('about.license') }));
    expect(openURL).toHaveBeenLastCalledWith('https://github.com/MSalman5230/adwam/blob/master/LICENSE');
  } finally {
    openURL.mockRestore();
  }
});
