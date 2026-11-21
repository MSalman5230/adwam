import { act } from '@testing-library/react-native';

import { setDebugTime } from '../src/state/useClock';

export async function setFixedClock(now: number | null) {
  await act(() => setDebugTime(now));
}
