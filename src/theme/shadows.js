/**
 * Track Device Design System - Shadows
 *
 * Spread these objects into a View's style to apply consistent elevation.
 *
 * Example:
 *   <View style={[styles.card, shadows.card]}>
 */

const shadows = {
  /** Subtle card elevation - white surface on light background */
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  /** Medium card - slightly more pronounced separation */
  cardMedium: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  /** Floating action button or overlaid element */
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
  },
};

export default shadows;
