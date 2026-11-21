import { useCalendars } from 'expo-localization';

import type { MessageFormat } from './messages';

export function useMessageFormat(placeTimeZone?: string): MessageFormat {
  const calendar = useCalendars()[0];
  return {
    timeZone: placeTimeZone ?? calendar?.timeZone ?? 'UTC',
    uses24HourClock: calendar?.uses24hourClock === true,
  };
}
