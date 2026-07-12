import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { LIVE_TRACKING_NOTIFICATION } from '../../constants/notification';

const listeners = new Set();
let lastForegroundService = null;

function notifyLocations(locations = []) {
  locations.forEach((location) => {
    listeners.forEach((callback) => {
      callback(location);
    });
  });
}

TaskManager.defineTask(
  LIVE_TRACKING_NOTIFICATION.TASK_NAME,
  ({ data, error }) => {
    if (error) {
      console.warn('[LocationTaskService] Background location task error.', error);
      return;
    }

    notifyLocations(data?.locations ?? []);
  }
);

function buildTaskOptions(options = {}, foregroundService) {
  return {
    accuracy: Location.Accuracy.Highest,
    timeInterval: 1000,
    distanceInterval: 0,
    ...options,
    foregroundService,
  };
}

export function subscribeToLocationTask(callback) {
  listeners.add(callback);

  return () => {
    listeners.delete(callback);
  };
}

export function isAndroidForegroundLocationSupported() {
  return Platform.OS === 'android' && !isRunningInExpoGo();
}

export async function startAndroidForegroundLocationUpdates(
  options = {},
  foregroundService
) {
  if (!isAndroidForegroundLocationSupported()) {
    throw new Error(
      'Android foreground location service requires a Development Build or installed APK.'
    );
  }

  lastForegroundService = foregroundService;
  await Location.startLocationUpdatesAsync(
    LIVE_TRACKING_NOTIFICATION.TASK_NAME,
    buildTaskOptions(options, foregroundService)
  );
}

export async function updateAndroidForegroundServiceNotification(
  options = {},
  foregroundService
) {
  if (!isAndroidForegroundLocationSupported()) {
    return false;
  }

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    LIVE_TRACKING_NOTIFICATION.TASK_NAME
  );

  if (!hasStarted) {
    return false;
  }

  lastForegroundService = foregroundService;
  await Location.startLocationUpdatesAsync(
    LIVE_TRACKING_NOTIFICATION.TASK_NAME,
    buildTaskOptions(options, foregroundService)
  );
  return true;
}

export async function stopAndroidForegroundLocationUpdates() {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LIVE_TRACKING_NOTIFICATION.TASK_NAME
    );

    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(
        LIVE_TRACKING_NOTIFICATION.TASK_NAME
      );
    }
  } catch (error) {
    console.warn('Failed to stop Android foreground location updates.', error);
  } finally {
    lastForegroundService = null;
  }
}

export function getLastForegroundService() {
  return lastForegroundService;
}
