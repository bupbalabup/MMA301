import { Image, StyleSheet } from 'react-native';

const ICONS = {
  dashboard: require('../../assets/icons/dashboard.png'),
  liveMap: require('../../assets/icons/live-map.png'),
  device: require('../../assets/icons/device.png'),
  history: require('../../assets/icons/history.png'),
  settings: require('../../assets/icons/settings.png'),
  location: require('../../assets/icons/location.png'),
  movement: require('../../assets/icons/movement.png'),
  parking: require('../../assets/icons/parking.png'),
  speed: require('../../assets/icons/speed.png'),
  maxSpeed: require('../../assets/icons/max-speed.png'),
  stoppedDuration: require('../../assets/icons/stopped-duration.png'),
  distance: require('../../assets/icons/distance.png'),
  lastUpdate: require('../../assets/icons/last-update.png'),
  coordinates: require('../../assets/icons/coordinates.png'),
  online: require('../../assets/icons/online.png'),
  lostConnection: require('../../assets/icons/lost-connection.png'),
  offlineData: require('../../assets/icons/offline-data.png'),
  sync: require('../../assets/icons/sync.png'),
  pendingSync: require('../../assets/icons/pending-sync.png'),
  retry: require('../../assets/icons/retry.png'),
  permission: require('../../assets/icons/permission.png'),
  foregroundLocation: require('../../assets/icons/foreground-location.png'),
  backgroundLocation: require('../../assets/icons/background-location.png'),
  autoStart: require('../../assets/icons/auto-start.png'),
  batteryOptimization: require('../../assets/icons/battery-optimization.png'),
  notification: require('../../assets/icons/notification.png'),
  back: require('../../assets/icons/back.png'),
  close: require('../../assets/icons/close.png'),
  expand: require('../../assets/icons/expand.png'),
  collapse: require('../../assets/icons/collapse.png'),
};

export const TRACK_ICON_NAMES = Object.freeze(Object.keys(ICONS));

const VISUAL_SIZES = {
  card: 24,
  inline: 18,
  permission: 52,
  row: 22,
  status: 16,
};

export default function TrackIcon({
  accessibilityLabel,
  color,
  name,
  size,
  style,
  visualSize = 'card',
}) {
  const source = ICONS[name] ?? ICONS.location;
  const isAccessible = Boolean(accessibilityLabel);
  const resolvedSize = size ?? VISUAL_SIZES[visualSize] ?? VISUAL_SIZES.card;

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={isAccessible ? 'image' : undefined}
      accessible={isAccessible}
      importantForAccessibility={isAccessible ? 'yes' : 'no-hide-descendants'}
      resizeMode="contain"
      source={source}
      style={[
        styles.icon,
        { height: resolvedSize, width: resolvedSize },
        color ? { tintColor: color } : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    flexShrink: 0,
    resizeMode: 'contain',
  },
});
