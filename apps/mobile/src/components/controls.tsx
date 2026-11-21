import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '../icons';
import { t } from '../language/messages';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

export type ButtonVariant = 'filled' | 'outlined' | 'tonal' | 'text';
export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconPosition?: 'start' | 'end';
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'filled', icon, iconPosition = 'start', small, disabled, style }: ButtonProps) {
  const { palette } = useTheme();
  const filled = variant === 'filled';
  const tonal = variant === 'tonal';
  const color = filled ? palette.onGreen : tonal ? palette.onSage : palette.green;
  const backgroundColor = filled ? palette.green : tonal ? palette.sage : 'transparent';
  const symbol = icon && <Icon name={icon} size={small ? 18 : 20} color={color} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: disabled ? 0.45 : pressed ? 0.83 : 1 },
        variant === 'outlined' && { borderWidth: 1, borderColor: palette.hair2 },
        (small || variant === 'text') && styles.shortButton,
        style,
      ]}
    >
      {iconPosition === 'start' && symbol}
      <Text style={[typography.button, small && typography.supporting, { color, textAlign: 'center' }]}>{label}</Text>
      {iconPosition === 'end' && symbol}
    </Pressable>
  );
}

type Choice<Value extends string> = { value: Value; label: string; disabled?: boolean };

export function Segmented<Value extends string>({ options, value, onChange, label }: {
  options: readonly Choice<Value>[]; value: Value; onChange: (value: Value) => void; label: string;
}) {
  const { palette } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segmented, { backgroundColor: palette.surface, borderColor: palette.hair2 }]}>
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked, disabled: Boolean(option.disabled) }}
            disabled={option.disabled}
            onPress={() => onChange(option.value)}
            style={[styles.segment, { backgroundColor: checked ? palette.sage : palette.surface, opacity: option.disabled ? 0.45 : 1 }]}
          >
            <Text style={[typography.button, { color: checked ? palette.onSage : palette.ink2, textAlign: 'center' }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Switch({ label, checked, onChange, disabled }: {
  label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.toggleTarget, disabled && styles.disabled]}
    >
      <View style={[styles.toggle, {
        backgroundColor: checked ? palette.green : palette.hair2,
        alignItems: checked ? 'flex-end' : 'flex-start',
      }]}>
        <View style={[styles.thumb, { backgroundColor: checked ? palette.onGreen : palette.surface }]} />
      </View>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { palette } = useTheme();
  const color = selected ? palette.onSage : palette.ink;
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={styles.chipTarget}>
      <View style={[styles.chip, { backgroundColor: selected ? palette.sage : 'transparent', borderColor: selected ? palette.sage : palette.hair2 }]}>
        {selected && <Icon name="check" size={16} color={color} />}
        <Text style={[typography.supporting, { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function Tag({ label, tone = 'sage', icon }: { label: string; tone?: 'sage' | 'gold' | 'rust'; icon?: IconName }) {
  const { palette } = useTheme();
  const [backgroundColor, color] = tone === 'rust' ? [palette.rustSoft, palette.rust]
    : tone === 'gold' ? [palette.goldSoft, palette.gold] : [palette.sage, palette.onSage];
  return (
    <View style={[styles.tag, { backgroundColor }]}>
      {icon && <Icon name={icon} size={14} color={color} />}
      <Text style={[typography.tag, { color }]}>{label}</Text>
    </View>
  );
}

export function Checkbox({ label, checked, onChange, disabled }: {
  label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.checkbox, disabled && styles.disabled]}
    >
      <View style={[styles.box, { backgroundColor: checked ? palette.green : 'transparent', borderColor: checked ? palette.green : palette.hair2 }]}>
        {checked && <Icon name="check" size={16} color={palette.onGreen} />}
      </View>
      <Text style={[typography.supporting, { color: palette.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Stepper({ value, min = 0, max = Infinity, onChange }: {
  value: number; min?: number; max?: number; onChange: (value: number) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={[styles.stepper, { backgroundColor: palette.paper2, borderColor: palette.hair2 }]}>
      <Button label={t('common.fewer')} icon="remove" variant="text" small disabled={value <= min} onPress={() => onChange(Math.max(min, value - 1))} />
      <Text accessibilityLiveRegion="polite" style={[typography.listTitle, { color: palette.ink }]}>{value}</Text>
      <Button label={t('common.more')} icon="add" variant="text" small disabled={value >= max} onPress={() => onChange(Math.min(max, value + 1))} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 24, paddingHorizontal: 22, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  shortButton: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 12 },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  toggleTarget: { minHeight: 44, justifyContent: 'center' },
  toggle: { width: 46, height: 26, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 3 },
  thumb: { width: 20, height: 20, borderRadius: 10 },
  chipTarget: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  chip: { minHeight: 34, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { minHeight: 24, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4 },
  checkbox: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  box: { width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepper: { borderWidth: 1, borderRadius: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
  disabled: { opacity: 0.45 },
});
