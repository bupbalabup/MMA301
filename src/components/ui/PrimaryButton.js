/**
 * PrimaryButton - Full-width primary call-to-action button.
 *
 * Props:
 *   label       {string}    - button text
 *   onPress     {function}  - press handler
 *   loading     {boolean}   - optional, shows loading text and disables
 *   disabled    {boolean}   - optional
 *   loadingLabel {string}   - optional text to show while loading
 *   style       {object}    - optional outer style override
 */

import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

export default function PrimaryButton({
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
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    paddingVertical: spacing.md + 2,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.button,
    color: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
});
