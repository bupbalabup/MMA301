/**
 * SurfaceCard - White elevated card with consistent radius and shadow.
 *
 * Props:
 *   children  {ReactNode}
 *   style     {object}   - optional additional style
 */

import { StyleSheet, View } from 'react-native';

import { colors, radius, shadows, spacing } from '../../theme';

export default function SurfaceCard({ children, style }) {
  return (
    <View style={[styles.card, shadows.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    padding: spacing.lg,
  },
});
