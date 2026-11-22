import { expect, it } from 'vitest';

import { colors } from './tokens';

const pairs = [
  ['goldText', 'paper'], ['goldText', 'surface'], ['goldText', 'sage'], ['goldText', 'goldSoft'],
  ['goldText', 'doneSurface'], ['goldText', 'fastingSurface'],
  ['paperCaption', 'paper'],
  ['ink2', 'surface'], ['ink2', 'sage'], ['ink2', 'sys'], ['ink2', 'doneSurface'],
] as const;

function luminance(hex: string) {
  const linearChannel = (offset: number) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linearChannel(1) + 0.7152 * linearChannel(3) + 0.0722 * linearChannel(5);
}

for (const [mode, palette] of Object.entries(colors)) {
  it.each(pairs)(`${mode} %s on %s meets WCAG AA for small text`, (foreground, background) => {
    const text = luminance(palette[foreground]);
    const surface = luminance(palette[background]);
    expect((Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
}
