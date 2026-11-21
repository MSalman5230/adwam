import { afterEach, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { Checkbox } from '../src/components/controls';
import { t } from '../src/language/messages';
import { useClock } from '../src/state/useClock';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { setFixedClock } from './fixed-clock';

function Reminder() {
  const now = useClock();
  const [checked, setChecked] = useState(false);
  return <>
    <Text>{new Date(now).toISOString()}</Text>
    <Checkbox label={t('reminder.tick.done')} checked={checked} onChange={setChecked} />
  </>;
}

afterEach(() => setFixedClock(null));

it('uses a fixed clock and updates the accessible state when the user ticks a reminder', async () => {
  const now = Date.UTC(2026, 11, 18, 7);
  await setFixedClock(now);
  await render(<ThemeProvider><Reminder /></ThemeProvider>);

  expect(screen.getByText(new Date(now).toISOString())).toBeOnTheScreen();
  const label = t('reminder.tick.done');
  const checkbox = screen.getByRole('checkbox', { name: label });
  expect(checkbox).not.toBeChecked();
  await fireEvent.press(checkbox);
  expect(screen.getByRole('checkbox', { name: label })).toBeChecked();

  const later = now + 60_000;
  await setFixedClock(later);
  expect(screen.getByText(new Date(later).toISOString())).toBeOnTheScreen();
});
