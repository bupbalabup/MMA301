import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TrackIcon } from '../icons';
import { colors, radius, spacing, typography } from '../../theme';

export default function SettingsListItem({
  accessibilityLabel,
  destructive = false,
  icon,
  onPress,
  showDisclosure = true,
  subtitle,
  title,
  value,
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress && styles.pressed,
      ]}
    >
      {icon ? (
        <View style={[styles.iconBox, destructive && styles.dangerIconBox]}>
          <TrackIcon name={icon} size={20} />
        </View>
      ) : null}
      <View style={styles.textWrap}>
        <Text
          style={[styles.title, destructive && styles.dangerText]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
      {showDisclosure && onPress ? (
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={styles.disclosure}
        >
          {'>'}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dangerIconBox: {
    backgroundColor: colors.dangerSoft,
  },
  dangerText: {
    color: colors.danger,
  },
  disclosure: {
    ...typography.cardTitle,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.medium,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pressed: {
    opacity: 0.72,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  value: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 1,
    maxWidth: 120,
  },
});
