import { Fragment } from 'react';
import { Text, type TextProps } from 'react-native';

import { useTheme } from './ThemeProvider';
import { typography } from './typography';

const salutation = '\uFDFA';

type Props = Omit<TextProps, 'children'> & { children: string };

export function Prose({ children, style, ...props }: Props) {
  const { palette } = useTheme();
  const text = children.replace(/ *\uFDFA/gu, `\u00a0${salutation}`)
    .replace(/(?<=\p{L})-(?=\p{L})/gu, '\u2011');
  const lines = text.split(salutation);
  return (
    <Text style={[typography.prose, { color: palette.ink }, style]} {...props}>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {index > 0 && <Text style={{ fontFamily: 'Amiri_400Regular' }}>{salutation}</Text>}
          {line}
        </Fragment>
      ))}
    </Text>
  );
}

export function ArabicText({ children, style, bold, ...props }: Props & { bold?: boolean }) {
  const { palette } = useTheme();
  return (
    <Text
      accessibilityLanguage="ar"
      style={[bold ? typography.arabicBold : typography.arabic, { color: palette.ink }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}
