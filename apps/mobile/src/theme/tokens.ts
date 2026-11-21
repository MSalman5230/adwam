export const colors = {
  light: {
    paper: '#F6F1E7', paper2: '#EFE8DA', surface: '#FFFDF8', hair: '#E3DACB', hair2: '#D3C8B3',
    ink: '#1F2A24', ink2: '#56615A', ink3: '#88908A',
    green: '#1E5B47', onGreen: '#FFFFFF', sage: '#E1E8D7', onSage: '#174536', rule: 'rgba(30,91,71,.32)',
    doneSurface: '#F0F3E8', fastingSurface: '#EFF1E6',
    gold: '#B08A3E', goldLine: 'rgba(176,138,62,.75)', goldSoft: '#F3EAD6',
    rust: '#9A4A2E', rustSoft: '#F6E5DC', scrim: 'rgba(24,28,26,.42)',
    inverse: '#2B3430', onInverse: '#F2EDE2', inverseAccent: '#A9D7C1',
    sys: '#F4EFE6', sys2: '#E9E2D5', shade: '#1E2723',
  },
  dark: {
    paper: '#121815', paper2: '#0E1311', surface: '#1A221E', hair: '#2A3430', hair2: '#3A4640',
    ink: '#ECE5D6', ink2: '#AEB5AC', ink3: '#7D867F',
    green: '#8FCBB0', onGreen: '#0D2A20', sage: '#21382E', onSage: '#C3E5D4', rule: 'rgba(143,203,176,.3)',
    doneSurface: '#1E2D26', fastingSurface: '#1E2E27',
    gold: '#D3AF67', goldLine: 'rgba(211,175,103,.6)', goldSoft: '#2D2717',
    rust: '#E49C80', rustSoft: '#3A241C', scrim: 'rgba(0,0,0,.55)',
    inverse: '#E9E2D3', onInverse: '#1A221E', inverseAccent: '#1E5B47',
    sys: '#222B27', sys2: '#2C3631', shade: '#0B0F0D',
  },
} as const;

export type ColorMode = keyof typeof colors;
export type AppearancePreference = ColorMode | 'system';
export type Palette = (typeof colors)[ColorMode];
