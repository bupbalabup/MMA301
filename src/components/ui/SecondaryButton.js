/**
 * SecondaryButton - Outlined button for secondary actions.
 *
 * Props:
 *   label       {string}
 *   onPress     {function}
 *   loading     {boolean}
 *   disabled    {boolean}
 *   loadingLabel {string}
 *   style       {object}
 */

import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

export default function SecondaryButton({
  disabled = false,
  label,
  loading = false,
  loadingLabel,
  onPress,
  style,
}) {
  const isDisabled = disabled || loading;
  const displayLabel = loading && loadingLabel ? loadingLabel : label;

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
      accessibilityLabel={displayLabel}
    >
      <Text style={styles.label}>{displayLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    paddingVertical: spacing.md + 2,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.button,
    color: colors.textPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
});
