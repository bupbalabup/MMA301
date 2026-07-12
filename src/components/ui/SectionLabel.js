/**
 * SectionLabel - Small uppercase section header label.
 *
 * Used between grouped cards for visual hierarchy.
 *
 * Props:
 *   label  {string}
 *   style  {object} - optional outer style
 */

import { StyleSheet, Text } from 'react-native';

import { colors, typography } from '../../theme';

export default function SectionLabel({ label, style }) {
  return (
    <Text style={[styles.label, style]}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 6,
    marginTop: 20,
  },
});
