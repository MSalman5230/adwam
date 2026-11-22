import { expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ScreenRecovery } from '../src/components/ScreenRecovery';
import { t } from '../src/language/messages';
import { reportScreenError } from '../src/services/crash-reporting';

jest.mock('../src/services/crash-reporting', () => ({ reportScreenError: jest.fn() }));

it('reports a screen error, displays a generic message, and retries on demand', async () => {
  const error = new Error('Adwam test error with private details');
  const retry = jest.fn(async () => {});
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 412, height: 915 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }}><ScreenRecovery error={error} retry={retry} /></SafeAreaProvider>);

  expect(reportScreenError).toHaveBeenCalledWith(error);
  expect(screen.queryByText(error.message)).toBeNull();
  expect(screen.getByRole('header', { name: t('recovery.title') })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t('recovery.retry') }));
  expect(retry).toHaveBeenCalledTimes(1);
});
