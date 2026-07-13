import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import { TrackIcon } from '../icons';
import { colors, radius, shadows, spacing } from '../../theme';

export default function MapRecenterButton({
  bottom = spacing.lg,
  onLocation,
  right = spacing.lg,
  style,
}) {
  const [checking, setChecking] = useState(true);
  const [servicesEnabled, setServicesEnabled] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(null);
  const mountedRef = useRef(true);

  async function refreshAvailability() {
    try {
      const [serviceState, permission] = await Promise.all([
        Location.hasServicesEnabledAsync(),
        Location.getForegroundPermissionsAsync(),
      ]);
      const granted = permission.granted || permission.status === 'granted';
      if (mountedRef.current) {
        setServicesEnabled(serviceState);
        setPermissionGranted(granted);
      }
      return { granted, serviceState };
    } catch (error) {
      if (mountedRef.current) {
        setServicesEnabled(false);
        setPermissionGranted(false);
      }
      return { granted: false, serviceState: false };
    } finally {
      if (mountedRef.current) {
        setChecking(false);
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    refreshAvailability();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function showLocationServicesAlert() {
    Alert.alert(
      'Dịch vụ vị trí đang tắt',
      'Hãy bật Dịch vụ vị trí trong cài đặt hệ thống để dùng nút định vị.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
      ]
    );
  }

  function showPermissionAlert() {
    Alert.alert(
      'Cần quyền vị trí',
      'Tính năng này cần quyền Vị trí để đưa bản đồ về vị trí của bạn.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
      ]
    );
  }

  async function handlePress() {
    if (checking) {
      return;
    }

    const availability = await refreshAvailability();

    if (availability.serviceState === false) {
      showLocationServicesAlert();
      return;
    }

    if (availability.granted !== true) {
      showPermissionAlert();
      return;
    }

    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { coords } = currentLocation;

      if (
        Number.isFinite(coords?.latitude) &&
        Number.isFinite(coords?.longitude)
      ) {
        onLocation?.(coords);
      }
    } catch (error) {
      Alert.alert(
        'Không thể định vị',
        'Ứng dụng chưa lấy được vị trí hiện tại. Vui lòng thử lại sau.',
        [{ text: 'Đã hiểu' }]
      );
    }
  }

  const unavailable = checking || servicesEnabled === false || permissionGranted === false;

  return (
    <Pressable
      accessibilityLabel="Đưa bản đồ về vị trí của tôi"
      accessibilityRole="button"
      hitSlop={8}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        shadows.floating,
        { bottom, right },
        unavailable && styles.buttonUnavailable,
        pressed && styles.pressed,
        style,
      ]}
    >
      <TrackIcon
        name="location"
        size={22}
        color={unavailable ? colors.textMuted : colors.primary}
      />
      {unavailable ? <View style={styles.slash} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    width: 48,
  },
  buttonUnavailable: {
    backgroundColor: colors.surfaceSecondary,
  },
  pressed: {
    opacity: 0.82,
  },
  slash: {
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
    width: 26,
  },
});
