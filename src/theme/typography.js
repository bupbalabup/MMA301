/**
 * Track Device Design System - Typography
 *
 * Each token is a partial StyleSheet object you can spread into a style.
 *
 * Example:
 *   import { typography } from '../theme';
 *   ...
 *   <Text style={[typography.screenTitle, { color: colors.textPrimary }]}>
 */

const typography = {
  /** 28px / 900 - main screen title */
  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
  },
  /** 20px / 800 - section card heading */
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0,
  },
  /** 17px / 700 - card title or list item headline */
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  /** 15px / 400 - standard body text */
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  /** 13px / 500 - secondary descriptions, captions */
  caption: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  /** 11px / 600 - small labels above metrics */
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  /** 32px / 800 - large metric values (speed, duration) */
  metric: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0,
  },
  /** 18px / 700 - medium metric value */
  metricMedium: {
    fontSize: 18,
    fontWeight: '700',
  },
  /** 15px / 700 - button label */
  button: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
};

export default typography;
