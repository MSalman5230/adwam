import Svg, { Circle, Defs, Mask, Path, Rect } from 'react-native-svg';

import { filledSymbols, symbols } from './symbols.generated';

export type IconName = keyof typeof symbols;
type IconAppearance = { size?: number; color: string; label?: string };
const alternateSymbols: Partial<Record<IconName, { viewBox: string; paths: readonly string[] }>> = filledSymbols;

export function Icon({ name, size = 24, color, label, filled = false }: IconAppearance & { name: IconName; filled?: boolean }) {
  const alternate = filled ? alternateSymbols[name] : undefined;
  const { viewBox, paths } = alternate ?? symbols[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox={viewBox}
      accessibilityRole="image"
      accessibilityLabel={label}
      accessible={label !== undefined}
      importantForAccessibility={label ? 'auto' : 'no-hide-descendants'}
    >
      {paths.map((path) => <Path key={path} d={path} fill={color} />)}
    </Svg>
  );
}

export function Crescent({ size = 24, color, label }: IconAppearance) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityRole="image"
      accessibilityLabel={label}
      accessible={label !== undefined}
      importantForAccessibility={label ? 'auto' : 'no-hide-descendants'}
    >
      <Defs>
        <Mask id="crescent" x={0} y={0} width={24} height={24} maskUnits="userSpaceOnUse" maskType="luminance">
          <Rect width={24} height={24} fill="#fff" />
          <Circle cx={16.2} cy={8.6} r={7.4} fill="#000" />
        </Mask>
      </Defs>
      <Circle cx={11} cy={13} r={8.6} fill={color} mask="url(#crescent)" />
    </Svg>
  );
}
