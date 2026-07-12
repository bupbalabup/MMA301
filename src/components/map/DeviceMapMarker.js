import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, typography } from '../../theme';

export default function DeviceMapMarker({
  isLocal,
  isOnline,
  isSelected = false,
  size = 'md',
}) {
  const compact = size === 'sm';
  const bodyColor = isOnline
    ? isLocal ? colors.markerLocal : colors.markerRemote
    : colors.markerOffline;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.touchArea,
        compact && styles.touchAreaCompact,
      ]}
    >
      <View style={[styles.selectedRing, isSelected && styles.selectedRingVisible]}>
        <View
          style={[
            styles.body,
            shadows.card,
            compact && styles.bodyCompact,
            { backgroundColor: bodyColor },
          ]}
        >
          <View style={[styles.deviceSlot, compact && styles.deviceSlotCompact]} />
          <View style={[styles.waypoint, compact && styles.waypointCompact]}>
            <View style={[styles.waypointCenter, compact && styles.waypointCenterCompact]} />
          </View>
        </View>
      </View>
      <View style={[styles.identityBadge, compact && styles.identityBadgeCompact]}>
        <Text style={[styles.identityText, compact && styles.identityTextCompact]}>
          {isLocal ? 'N' : 'R'}
        </Text>
      </View>
      {!isOnline ? <View style={[styles.offlineBar, compact && styles.offlineBarCompact]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    borderColor: colors.surface,
    borderRadius: radius.medium,
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    width: 34,
  },
  bodyCompact: {
    borderRadius: radius.small,
    height: 34,
    width: 27,
  },
  deviceSlot: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 3,
    position: 'absolute',
    top: 7,
    width: 11,
  },
  deviceSlotCompact: {
    height: 2,
    top: 5,
    width: 8,
  },
  identityBadge: {
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    borderColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: 1,
    height: 16,
    justifyContent: 'center',
    position: 'absolute',
    right: 1,
    width: 16,
  },
  identityBadgeCompact: {
    height: 13,
    width: 13,
  },
  identityText: {
    ...typography.label,
    color: colors.surface,
    fontSize: 8,
  },
  identityTextCompact: {
    fontSize: 7,
  },
  offlineBar: {
    backgroundColor: colors.danger,
    height: 3,
    position: 'absolute',
    transform: [{ rotate: '-42deg' }],
    width: 43,
  },
  offlineBarCompact: {
    width: 34,
  },
  selectedRing: {
    borderColor: 'transparent',
    borderRadius: radius.large,
    borderWidth: 3,
    padding: 2,
  },
  selectedRingVisible: {
    borderColor: colors.textPrimary,
  },
  touchArea: {
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
    width: 52,
  },
  touchAreaCompact: {
    height: 44,
    width: 42,
  },
  waypoint: {
    alignItems: 'center',
    borderColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 3,
    height: 19,
    justifyContent: 'center',
    marginTop: 5,
    width: 19,
  },
  waypointCenter: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 5,
    width: 5,
  },
  waypointCenterCompact: {
    height: 4,
    width: 4,
  },
  waypointCompact: {
    borderWidth: 2,
    height: 15,
    width: 15,
  },
});

