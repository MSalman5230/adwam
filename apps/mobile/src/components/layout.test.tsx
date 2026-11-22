import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';

import { DayLine, TrackerDots } from './calendarDisplay';
import { AppBar, Hero, PageTitle, SectionHeader } from './headers';
import { Sheet, Snackbar } from './overlays';

const actions = vi.hoisted(() => ({ press: [] as (() => void)[], requestClose: undefined as (() => void) | undefined }));

vi.mock('react-native', async () => {
  const { createElement } = await import('react');
  type MockProps = {
    children?: React.ReactNode;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    accessibilityLiveRegion?: string;
    accessibilityViewIsModal?: boolean;
    role?: string;
    'aria-hidden'?: boolean;
    onPress?: () => void;
  };
  const element = (tag: string) => (props: MockProps) => createElement(tag, {
    role: props.role ?? props.accessibilityRole,
    'aria-label': props.accessibilityLabel,
    'aria-live': props.accessibilityLiveRegion,
    'aria-modal': props.accessibilityViewIsModal,
    'aria-hidden': props['aria-hidden'],
  }, props.children);

  return {
    Text: element('span'), View: element('div'), ScrollView: element('div'), KeyboardAvoidingView: element('div'),
    Pressable: (props: MockProps) => {
      if (props.onPress) actions.press.push(props.onPress);
      return element('button')(props);
    },
    Modal: ({ visible, onRequestClose, children }: MockProps & { visible: boolean; onRequestClose: () => void }) => {
      actions.requestClose = onRequestClose;
      return visible ? children : null;
    },
    Animated: { View: element('div'), Value: class { interpolate() { return 0; } } },
    StyleSheet: { create: <T,>(styles: T) => styles, hairlineWidth: 1 },
    useWindowDimensions: () => ({ height: 800, fontScale: 1 }),
    AccessibilityInfo: { addEventListener: () => ({ remove: () => undefined }) },
  };
});
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 20 }) }));
vi.mock('react-native-reanimated', () => ({ useReducedMotion: () => false }));
vi.mock('../icons', () => ({ Icon: () => null }));
vi.mock('../theme/ThemeProvider', async () => {
  const { colors } = await import('../theme/tokens');
  return { useTheme: () => ({ palette: colors.light }) };
});
vi.mock('@adwam/core', () => ({ fmtClock: () => '11:58 am' }));
vi.mock('../language/messages', () => {
  const messages: Record<string, string> = {
    'calendar.prayer.jumuah': 'Jumuʿah', 'today.dayLine.accessible': 'Prayer anchors',
    'today.dayLine.untilMaghrib': 'Maghrib in four hours.', 'common.undo': 'Undo',
  };
  return { t: (key: string) => messages[key], renderMessage: ({ key }: { key: string }) => messages[key] };
});

beforeEach(() => { actions.press.length = 0; actions.requestClose = undefined; });

it('renders the three types of headings with context', () => {
  const html = renderToStaticMarkup(<>
    <Hero title="Today" subtitle="Friday" />
    <PageTitle title="Friday preparation" overline="Weekly" subtitle="Before Jumuʿah" />
    <SectionHeader title="Coming up" aside="2 items" />
  </>);
  expect(html.match(/role="header"/g)).toHaveLength(3);
  for (const text of ['Today', 'Friday', 'Weekly', 'Before Jumuʿah', 'Coming up', '2 items']) expect(html).toContain(text);
});

it('keeps the app bar action available and reveals its title after scrolling', () => {
  const back = vi.fn();
  const start = { label: 'Back', icon: 'arrow_back', onPress: back } as const;
  expect(renderToStaticMarkup(<AppBar title="Details" start={start} />)).toContain('aria-hidden="true"');
  expect(renderToStaticMarkup(<AppBar title="Details" start={start} scrolled />)).toContain('aria-hidden="false"');
  expect(renderToStaticMarkup(<AppBar title="Details" start={start} staticTitle />)).toContain('aria-label="Back"');
  actions.press[0]?.();
  expect(back).toHaveBeenCalledOnce();
});

it('reads each anchor with its time and reports tracker progress as text', () => {
  const html = renderToStaticMarkup(<>
    <DayLine format={{ timeZone: 'Europe/London', uses24HourClock: false }} timeline={{
      position: 0.25,
      marks: [{ name: 'jumuah', at: 0, label: { key: 'calendar.prayer.jumuah' }, position: 0.25, past: false }],
      caption: { key: 'today.dayLine.untilMaghrib' },
    }} />
    <TrackerDots total={3} completed={2} label="White Days this month · 2 of 3" />
  </>);
  expect(html).toContain('aria-label="Prayer anchors. Jumuʿah 11:58 am. Maghrib in four hours."');
  expect(html).toContain('White Days this month · 2 of 3');
});

it('announces the snackbar and dispatches Undo', () => {
  const undo = vi.fn();
  const html = renderToStaticMarkup(<Snackbar message="Marked done" onUndo={undo} />);
  expect(html).toContain('role="status"');
  expect(html).toContain('aria-live="polite">Marked done');
  expect(html).toContain('Undo');
  actions.press[0]?.();
  expect(undo).toHaveBeenCalledOnce();
});

it('shows a labelled modal and routes backdrop and hardware Back to the same dismissal', () => {
  const close = vi.fn();
  expect(renderToStaticMarkup(<Sheet title="Prayer times" open={false} onClose={close} />)).toBe('');
  const html = renderToStaticMarkup(<Sheet title="Prayer times" open onClose={close} lead="Friday anchors" />);
  expect(html).toContain('role="dialog" aria-label="Prayer times" aria-modal="true"');
  expect(html).toContain('Friday anchors');
  actions.press[0]?.();
  actions.requestClose?.();
  expect(close).toHaveBeenCalledTimes(2);
});
