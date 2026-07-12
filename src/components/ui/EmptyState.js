/**
 * EmptyState - Polished centered empty, error, or loading state.
 *
 * Uses typography and spacing instead of decorative artwork.
 *
 * Props:
 *   title        {string}    - main heading
 *   message      {string}    - supporting description
 *   actionLabel  {string}    - optional button label
 *   onAction     {function}  - optional button handler
 *   variant      {'default'|'error'} - controls title color
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import EmptyStateIllustration from '../branding/EmptyStateIllustration';

export default function EmptyState({
  actionLabel,
  illustration,
  message,
  onAction,
  title,
  variant = 'default',
}) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {illustration ? (
          <EmptyStateIllustration
            type={illustration}
            height={104}
            style={styles.illustration}
          />
        ) : null}
        <Text
          style={[
            styles.title,
            variant === 'error' && styles.titleError,
          ]}
        >
          {title}
        </Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {actionLabel && onAction ? (
          <Pressable
            style={({ pressed }) => [
              styles.action,
              pressed && styles.actionPressed,
            ]}
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={4}
          >
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm + 3,
  },
  actionLabel: {
    ...typography.button,
    color: colors.surface,
  },
  actionPressed: {
    opacity: 0.8,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.large,
    borderWidth: 1,
    maxWidth: 320,
    padding: spacing.xl,
    width: '100%',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  illustration: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  titleError: {
    color: colors.danger,
  },
});
