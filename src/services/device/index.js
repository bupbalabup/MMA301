export { getOrCreateDeviceId } from './deviceIdentityService';
export {
  getCurrentPlatform,
  getCurrentPlatformLabel,
  getDetectedDeviceName,
  isGenericDeviceName,
} from './deviceMetadataService';
export {
  checkBatteryOptimizationStatus,
  checkNotificationPermission,
  confirmAutoStartEnabledByUser,
  getAndroidManufacturer,
  getAutoStartStatus,
  openAutoStartSettings,
  openBatteryOptimizationSettings,
  requestNotificationPermission,
} from './deviceSetupService';
