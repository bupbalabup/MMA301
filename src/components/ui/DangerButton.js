/**
 * DangerButton - Outlined button for destructive actions (e.g. Đăng xuất).
 *
 * Props:
 *   label    {string}
 *   onPress  {function}
 *   loading  {boolean}
 *   disabled {boolean}
 *   style    {object}
 */

import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

export default function DangerButton({
  disabled = false,
  label,
  loading = false,
  onPress,
  style,
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radius.medium,
    borderWidth: 1,
    paddingVertical: spacing.md + 2,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.button,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
});
