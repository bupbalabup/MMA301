import * as Device from 'expo-device';
import { Platform } from 'react-native';

const GENERIC_NAMES = new Set([
  '',
  'android device',
  'ios device',
  'device',
  'thiết bị',
  'thiết bị android',
  'thiết bị ios',
]);

function cleanName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getCurrentPlatform() {
  if (Platform.OS === 'ios') {
    return 'ios';
  }

  if (Platform.OS === 'android') {
    return 'android';
  }

  return null;
}

export function getCurrentPlatformLabel() {
  const platform = getCurrentPlatform();

  if (platform === 'ios') {
    return 'Thiết bị iOS';
  }

  if (platform === 'android') {
    return 'Thiết bị Android';
  }

  return 'Thiết bị';
}

export function getDetectedDeviceName() {
  return (
    cleanName(Device.deviceName) ||
    cleanName(Device.modelName) ||
    getCurrentPlatformLabel()
  );
}

export function isGenericDeviceName(value) {
  return GENERIC_NAMES.has(cleanName(value).toLowerCase());
}
