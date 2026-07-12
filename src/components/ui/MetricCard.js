/**
 * MetricCard - Compact tile showing a label and a prominent numeric value.
 *
 * Props:
 *   label    {string}  - metric name (e.g. "Tốc độ hiện tại")
 *   value    {string}  - formatted value (e.g. "72 km/h")
 *   style    {object}  - optional additional style for the outer container
 */

import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../../theme';
import TrackIcon from '../icons/TrackIcon';

export default function MetricCard({ icon, label, style, value }) {
  return (
    <View style={[styles.card, shadows.card, style]}>
      <View style={styles.header}>
        {icon ? <TrackIcon name={icon} size={20} /> : null}
        <Text style={styles.label} numberOfLines={2}>{label}</Text>
      </View>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    padding: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  value: {
    ...typography.metricMedium,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
});
