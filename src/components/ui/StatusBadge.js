/**
 * StatusBadge - A small colored dot paired with a readable text label.
 *
 * Color alone never communicates meaning; the label is always shown.
 *
 * Props:
 *   status   {string}   - internal status key (e.g. 'Moving', 'Online', 'Idle')
 *   label    {string}   - Vietnamese display label (e.g. 'Đang di chuyển')
 *   size     {'sm'|'md'} - optional, defaults to 'md'
 */

import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

function getDotColor(status) {
  const map = {
    Moving: colors.moving,
    Paused: colors.paused,
    Parking: colors.parking,
    'GPS Lost': colors.gpsLost,
    Idle: colors.idle,
    Online: colors.online,
    Offline: colors.offline,
  };

  return map[status] ?? colors.textMuted;
}

function getBgColor(status) {
  const map = {
    Moving: colors.movingSoft,
    Paused: colors.pausedSoft,
    Parking: colors.parkingSoft,
    'GPS Lost': colors.gpsLostSoft,
    Idle: colors.idleSoft,
    Online: colors.onlineSoft,
    Offline: colors.offlineSoft,
  };

  return map[status] ?? colors.surfaceSecondary;
}

function getTextColor(status) {
  return getDotColor(status);
}

export default function StatusBadge({ label, size = 'md', status }) {
  const dotColor = getDotColor(status);
  const bgColor = getBgColor(status);
  const textColor = getTextColor(status);
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <View
        style={[
          styles.dot,
          isSmall && styles.dotSmall,
          { backgroundColor: dotColor },
        ]}
      />
      <Text
        style={[
          styles.label,
          isSmall && styles.labelSmall,
          { color: textColor },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
  },
  dot: {
    borderRadius: radius.pill,
    height: 8,
    marginRight: spacing.xs,
    width: 8,
  },
  dotSmall: {
    height: 6,
    width: 6,
  },
  label: {
    ...typography.button,
    fontSize: 13,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
});
