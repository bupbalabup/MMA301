/**
 * AppHeader - Screen page title with optional subtitle.
 *
 * Used inside ScrollView content areas for screens that own their own header,
 * separate from the navigation stack header.
 *
 * Props:
 *   title     {string}  - required, main screen title
 *   subtitle  {string}  - optional secondary line
 */

import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

export default function AppHeader({ title, subtitle }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
});
