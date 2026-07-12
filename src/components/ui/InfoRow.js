/**
 * InfoRow - A labeled key/value row with a bottom divider.
 *
 * Used in detail cards and settings sections.
 *
 * Props:
 *   label  {string}  - left-side label text
 *   value  {string}  - right-side value text
 *   last   {boolean} - if true, hides the bottom border (for last row)
 */

import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

export default function InfoRow({ label, last = false, value }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    fontWeight: '600',
    paddingRight: spacing.sm,
  },
  row: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: spacing.sm + 2,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  value: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1.4,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
});
