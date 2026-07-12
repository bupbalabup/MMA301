import { Image, StyleSheet, View } from 'react-native';

const ILLUSTRATIONS = {
  offline: require('../../assets/illustrations/offline.png'),
  noDevices: require('../../assets/illustrations/no-devices.png'),
  noHistory: require('../../assets/illustrations/no-history.png'),
  noMap: require('../../assets/illustrations/map-empty.png'),
  noCoordinates: require('../../assets/illustrations/map-empty.png'),
  syncFailed: require('../../assets/illustrations/sync-failed.png'),
  permissionMissing: require('../../assets/illustrations/permission-missing.png'),
};

export default function EmptyStateIllustration({ height = 112, style, type }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
    >
      <Image
        source={ILLUSTRATIONS[type] ?? ILLUSTRATIONS.noMap}
        style={[styles.image, { height, width: height * 1.6 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'contain',
  },
});

