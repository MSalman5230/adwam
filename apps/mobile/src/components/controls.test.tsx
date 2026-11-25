import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';

import { Banner, Card, ListRow, Notice, OptionRow, RadioCard } from './cards';
import { Button, Checkbox, Chip, Segmented, Stepper, Switch, Tag } from './controls';

const controls = vi.hoisted(() => ({
  presses: [] as { label?: string; disabled?: boolean; press?: () => void }[],
  mode: 'light' as 'light' | 'dark',
}));

vi.mock('react-native', async () => {
  const { createElement } = await import('react');
  type MockProps = {
    children?: React.ReactNode;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    accessibilityState?: { checked?: boolean; selected?: boolean; disabled?: boolean };
    disabled?: boolean;
    onPress?: () => void;
    style?: ({ borderColor?: string } | false | undefined)[];
  };
  return {
    Text: ({ children }: MockProps) => createElement('span', null, children),
    View: ({ children, accessibilityRole: role, accessibilityLabel: label, style }: MockProps) => {
      const border = Array.isArray(style) ? style.flatMap((entry) => entry && entry.borderColor ? [entry.borderColor] : []).at(-1) : undefined;
      return createElement('div', { role, 'aria-label': label, 'data-border-color': border }, children);
    },
    Pressable: ({ children, disabled, onPress: press, accessibilityRole: role, accessibilityLabel: label, accessibilityState }: MockProps) => {
      controls.presses.push({ label, disabled, press });
      return createElement('button', {
        role, disabled, 'aria-label': label,
        'aria-checked': accessibilityState?.checked,
        'aria-selected': accessibilityState?.selected,
      }, children);
    },
    StyleSheet: { create: <T,>(styles: T) => styles, hairlineWidth: 1 },
    useWindowDimensions: () => ({ fontScale: 1 }),
  };
});
vi.mock('../icons', () => ({ Crescent: () => null, Icon: () => null }));
vi.mock('../theme/ThemeProvider', async () => {
  const { colors } = await import('../theme/tokens');
  return { useTheme: () => ({ palette: colors[controls.mode] }) };
});
vi.mock('../theme/Text', () => ({ Prose: ({ children }: { children: string }) => children }));
vi.mock('../language/messages', () => ({ t: (key: string) => key === 'common.fewer' ? 'Fewer' : 'More' }));

beforeEach(() => { controls.presses.length = 0; controls.mode = 'light'; });

it.each(['filled', 'outlined', 'tonal', 'text'] as const)('renders the %s button with its label and action', (variant) => {
  const press = vi.fn();
  const html = renderToStaticMarkup(<Button label="Continue" onPress={press} variant={variant} small />);
  expect(html).toContain('aria-label="Continue"');
  expect(html).toContain('role="button"');
  controls.presses[0]?.press?.();
  expect(press).toHaveBeenCalledOnce();
});

it('exposes the checked segment and returns the selected value', () => {
  const change = vi.fn();
  const html = renderToStaticMarkup(<Segmented label="Reminder" value="push" onChange={change} options={[
    { value: 'push', label: 'Push' }, { value: 'inapp', label: 'In-app' },
  ]} />);
  expect(html).toContain('role="radiogroup"');
  expect(html).toContain('aria-label="Push" aria-checked="true"');
  controls.presses.find(({ label }) => label === 'In-app')?.press?.();
  expect(change).toHaveBeenCalledWith('inapp');
});

it('shows and changes checkbox and switch states', () => {
  const change = vi.fn();
  const html = renderToStaticMarkup(<>
    <Checkbox label="Done" checked onChange={change} />
    <Switch label="Notifications" checked={false} onChange={change} />
  </>);
  expect(html).toContain('role="checkbox" aria-label="Done" aria-checked="true"');
  expect(html).toContain('role="switch" aria-label="Notifications" aria-checked="false"');
  controls.presses.forEach(({ press }) => press?.());
  expect(change.mock.calls).toEqual([[false], [true]]);
});

it.each([
  ['light', '#56615A'],
  ['dark', '#AEB5AC'],
] as const)('uses the prototype ink outline for unchecked boxes in %s mode', (mode, border) => {
  controls.mode = mode;
  const html = renderToStaticMarkup(<Checkbox label="Done" checked={false} onChange={vi.fn()} />);
  expect(html).toContain(`data-border-color="${border}"`);
});

it('labels chips and tags and exposes the selected chip to assistive technology', () => {
  const press = vi.fn();
  const html = renderToStaticMarkup(<><Chip label="Fasts" selected onPress={press} /><Tag label="No fasting" tone="rust" /></>);
  expect(html).toContain('aria-label="Fasts" aria-selected="true"');
  expect(html).toContain('No fasting');
  controls.presses[0]?.press?.();
  expect(press).toHaveBeenCalledOnce();
});

it('enforces the stepper minimum and provides the increment action', () => {
  const change = vi.fn();
  renderToStaticMarkup(<Stepper value={0} onChange={change} max={2} />);
  expect(controls.presses.find(({ label }) => label === 'Fewer')?.disabled).toBe(true);
  controls.presses.find(({ label }) => label === 'More')?.press?.();
  expect(change).toHaveBeenCalledWith(1);
});

it('keeps a card tick separate from opening its detail', () => {
  const open = vi.fn();
  const tick = vi.fn();
  const html = renderToStaticMarkup(<Card title="Friday preparation" body="Arrive early." onPress={open}>
    <Checkbox label="Done" checked={false} onChange={tick} />
  </Card>);
  expect(html).toContain('Friday preparation');
  expect(html).toContain('Arrive early.');
  controls.presses.find(({ label }) => label === 'Done')?.press?.();
  expect(tick).toHaveBeenCalledWith(true);
  expect(open).not.toHaveBeenCalled();
});

it('provides actions for list rows, notices and banners', () => {
  const open = vi.fn();
  const html = renderToStaticMarkup(<>
    <ListRow title="Location" subtitle="London" onPress={open} />
    <Notice title="Notifications are off" body="Check here" actions={[{ label: 'Open settings', onPress: open }]} />
    <Banner title="Ramadan" body="Give more charity" onPress={open} />
  </>);
  for (const label of ['Location', 'London', 'Open settings', 'Ramadan']) expect(html).toContain(label);
  controls.presses.forEach(({ press }) => press?.());
  expect(open).toHaveBeenCalledTimes(3);
});

it('renders setup cards and options as radio choices with their selected state', () => {
  const choose = vi.fn();
  const html = renderToStaticMarkup(<>
    <RadioCard title="Recommended" selected onPress={choose} />
    <OptionRow title="In-app only" selected={false} onPress={choose} />
  </>);
  expect(html).toContain('role="radio" aria-checked="true"');
  expect(html).toContain('role="radio" aria-checked="false"');
  expect(html).toContain('Recommended');
  controls.presses[1]?.press?.();
  expect(choose).toHaveBeenCalledOnce();
});
