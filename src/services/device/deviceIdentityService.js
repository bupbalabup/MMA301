import AsyncStorage from '@react-native-async-storage/async-storage';

import { createId } from '../../utils/id';

const DEVICE_ID_STORAGE_KEY = 'trackcam.deviceId';

export async function getOrCreateDeviceId() {
  const existingDeviceId = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);

  if (existingDeviceId) {
    return existingDeviceId;
  }

  const deviceId = createId('device');
  await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);

  return deviceId;
}

