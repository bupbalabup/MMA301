import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadows, spacing, typography } from '../../theme';

export default function AppHeader({
  mode = 'large',
  rightSlot,
  subtitle,
  title,
}) {
  const insets = useSafeAreaInsets();
  const isCompact = mode === 'compact';
  const isTransparent = mode === 'transparent';

  return (
    <View
      style={[
        styles.container,
        isCompact ? styles.compact : styles.large,
        isTransparent && styles.transparent,
        { paddingTop: insets.top + (isCompact ? spacing.xs : spacing.md) },
        isCompact && !isTransparent && shadows.card,
      ]}
    >
      <View style={styles.titleRow}>
        <View style={styles.titleWrap}>
          <Text
            style={[styles.title, isCompact && styles.compactTitle]}
            numberOfLines={isCompact ? 1 : 2}
          >
            {title}
          </Text>
          {!isCompact && subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
          ) : null}
        </View>
        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    zIndex: 10,
  },
  compact: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: spacing.sm,
  },
  compactTitle: {
    ...typography.cardTitle,
  },
  large: {
    paddingBottom: spacing.md,
  },
  rightSlot: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
});
