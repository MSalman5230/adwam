import type { TextStyle } from 'react-native';

import type fontFiles from '../../fonts.json';

function typeface(fontFamily: keyof typeof fontFiles, fontSize: number, leading: number): TextStyle {
  return { fontFamily, fontSize, lineHeight: fontSize * leading };
}

export const typography = {
  hijriTitle: { ...typeface('SourceSerif4_700Bold', 34, 1.08), letterSpacing: -0.408 },
  pageTitle: { ...typeface('SourceSerif4_700Bold', 32, 1.08), letterSpacing: -0.384 },
  detailTitle: { ...typeface('SourceSerif4_700Bold', 28, 1.14), letterSpacing: -0.28 },
  setupTitle: { ...typeface('SourceSerif4_700Bold', 28, 1.15), letterSpacing: -0.28 },
  setupBody: typeface('SourceSans3_400Regular', 16, 1.45),
  sheetTitle: typeface('SourceSerif4_700Bold', 22, 1.2),
  sheetLead: typeface('SourceSans3_400Regular', 14.5, 1.45),
  appBar: typeface('SourceSerif4_600SemiBold', 19, 1.2),
  sectionTitle: typeface('SourceSerif4_600SemiBold', 19, 1.2),
  cardTitle: typeface('SourceSerif4_600SemiBold', 17, 1.2),
  bannerTitle: typeface('SourceSerif4_600SemiBold', 16.5, 1.25),
  listTitle: typeface('SourceSans3_600SemiBold', 16, 1.25),
  subtitle: typeface('SourceSans3_400Regular', 15.5, 1.35),
  detailSubtitle: typeface('SourceSans3_400Regular', 15, 1.4),
  body: typeface('SourceSans3_400Regular', 15.5, 1.5),
  prose: typeface('SourceSans3_400Regular', 15, 1.5),
  emphasis: typeface('SourceSans3_700Bold', 15, 1.5),
  italic: typeface('SourceSans3_400Regular_Italic', 15, 1.5),
  supporting: typeface('SourceSans3_400Regular', 14, 1.35),
  caption: typeface('SourceSans3_400Regular', 13.5, 1.35),
  sectionAside: typeface('SourceSans3_500Medium', 13, 1),
  small: typeface('SourceSans3_400Regular', 13, 1.35),
  prayerLabel: typeface('SourceSans3_500Medium', 12.5, 1.25),
  prayerTime: typeface('SourceSans3_400Regular', 12, 1.25),
  overline: {
    ...typeface('SourceSans3_600SemiBold', 11.5, 1.2),
    letterSpacing: 1.035, textTransform: 'uppercase',
  },
  tag: typeface('SourceSans3_600SemiBold', 12, 1),
  button: typeface('SourceSans3_600SemiBold', 15, 1.15),
  transliteration: typeface('SourceSerif4_400Regular_Italic', 16, 1.45),
  arabic: { ...typeface('Amiri_400Regular', 27, 1.9), textAlign: 'right', writingDirection: 'rtl' },
  arabicBold: { ...typeface('Amiri_700Bold', 27, 1.9), textAlign: 'right', writingDirection: 'rtl' },
} as const satisfies Record<string, TextStyle>;
