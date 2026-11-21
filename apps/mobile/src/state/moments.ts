import type { CivilDate, MessageKey } from '@adwam/core';

export const moments = [
  { id: 'fri-am', label: 'developerTools.moment.fridayMorning', date: '2026-12-18', minute: 690 },
  { id: 'fri-pm', label: 'developerTools.moment.fridayRain', date: '2026-12-18', minute: 908 },
  { id: 'tue', label: 'developerTools.moment.quietTuesday', date: '2026-12-01', minute: 602 },
  { id: 'white', label: 'developerTools.moment.whiteDays', date: '2026-12-22', minute: 602 },
  { id: 'shaban', label: 'developerTools.moment.endOfShaban', date: '2027-02-06', minute: 602 },
  { id: 'correction', label: 'developerTools.moment.correction', date: '2027-02-06', minute: 602 },
  { id: 'qadr', label: 'developerTools.moment.lastTen', date: '2027-02-27', minute: 1180 },
  { id: 'shawwal', label: 'developerTools.moment.shawwal', date: '2027-03-29', minute: 602 },
  { id: 'dq', label: 'developerTools.moment.dhulQadah', date: '2027-04-22', minute: 602 },
] as const satisfies readonly { id: string; label: MessageKey; date: CivilDate; minute: number }[];
