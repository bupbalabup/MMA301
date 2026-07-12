import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, NativeModules, PermissionsAndroid, Platform } from 'react-native';

const AUTO_START_STATUS_KEY = 'trackcam.setup.autoStartStatus.v1';

function androidApiLevel() {
  return Number(Platform.Version) || 0;
}

export function getAndroidManufacturer() {
  const manufacturer =
    Platform.constants?.Manufacturer ??
    Platform.constants?.Brand ??
    'Android';

  return String(manufacturer);
}

export async function checkNotificationPermission() {
  if (Platform.OS !== 'android' || androidApiLevel() < 33) {
    return { granted: true, required: false };
  }

  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  const granted = permission
    ? await PermissionsAndroid.check(permission)
    : false;

  return { granted, required: true };
}

export async function requestNotificationPermission() {
  if (Platform.OS !== 'android' || androidApiLevel() < 33) {
    return { granted: true, required: false };
  }

  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (!permission) {
    return { granted: false, required: true };
  }

  const result = await PermissionsAndroid.request(permission);
  return {
    blocked: result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    granted: result === PermissionsAndroid.RESULTS.GRANTED,
    required: true,
  };
}

async function openIntentOrAppSettings(action) {
  if (Platform.OS !== 'android') {
    await Linking.openSettings();
    return false;
  }

  try {
    await Linking.sendIntent(action);
    return true;
  } catch {
    await Linking.openSettings();
    return false;
  }
}

export async function openAutoStartSettings() {
  const manufacturer = getAndroidManufacturer().toLowerCase();
  const actions = [
    ['xiaomi', 'miui.intent.action.OP_AUTO_START'],
    ['huawei', 'huawei.intent.action.HSM_BOOTAPP_MANAGER'],
    ['vivo', 'android.settings.APPLICATION_DETAILS_SETTINGS'],
    ['oppo', 'android.settings.APPLICATION_DETAILS_SETTINGS'],
    ['realme', 'android.settings.APPLICATION_DETAILS_SETTINGS'],
    ['samsung', 'android.settings.APPLICATION_DETAILS_SETTINGS'],
  ];
  const match = actions.find(([brand]) => manufacturer.includes(brand));

  const opened = await openIntentOrAppSettings(
    match?.[1] ?? 'android.settings.APPLICATION_DETAILS_SETTINGS'
  );
  await recordAutoStartSettingsOpened();
  return opened;
}

export function openBatteryOptimizationSettings() {
  return openIntentOrAppSettings(
    'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS'
  );
}

export async function recordAutoStartSettingsOpened() {
  if (Platform.OS !== 'android') {
    return null;
  }

  const nextStatus = {
    openedAt: Date.now(),
    userConfirmedAt: null,
  };
  await AsyncStorage.setItem(AUTO_START_STATUS_KEY, JSON.stringify(nextStatus));
  return nextStatus;
}

export async function confirmAutoStartEnabledByUser() {
  if (Platform.OS !== 'android') {
    return null;
  }

  const currentStatus = await getAutoStartStatus();
  const nextStatus = {
    ...currentStatus,
    userConfirmedAt: Date.now(),
  };
  await AsyncStorage.setItem(AUTO_START_STATUS_KEY, JSON.stringify(nextStatus));
  return nextStatus;
}

export async function getAutoStartStatus() {
  if (Platform.OS !== 'android') {
    return { available: false };
  }

  try {
    const savedValue = await AsyncStorage.getItem(AUTO_START_STATUS_KEY);
    return savedValue ? JSON.parse(savedValue) : {};
  } catch {
    return {};
  }
}

export async function checkBatteryOptimizationStatus() {
  if (Platform.OS !== 'android') {
    return { available: false, ignoringBatteryOptimizations: null };
  }

  const nativeModule = NativeModules.TrackDeviceBatteryOptimization;
  if (typeof nativeModule?.isIgnoringBatteryOptimizations !== 'function') {
    return {
      available: false,
      error: 'Native battery optimization check is unavailable in this runtime.',
      ignoringBatteryOptimizations: null,
    };
  }

  try {
    const isIgnoring = await nativeModule.isIgnoringBatteryOptimizations();
    return {
      available: true,
      ignoringBatteryOptimizations: isIgnoring === true,
    };
  } catch (error) {
    return {
      available: false,
      error: error?.message ?? 'Battery optimization check failed.',
      ignoringBatteryOptimizations: null,
    };
  }
}
