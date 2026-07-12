import * as Location from 'expo-location';
import { Platform } from 'react-native';

import {
  checkPermission,
  isLocationServiceEnabled as checkLocationServiceEnabled,
  requestForegroundPermission as requestForegroundLocationPermission,
} from './locationPermissionService';
import {
  isAndroidForegroundLocationSupported,
  startAndroidForegroundLocationUpdates,
  stopAndroidForegroundLocationUpdates,
  subscribeToLocationTask,
} from './locationTaskService';

const defaultWatchOptions = {
  accuracy: Location.Accuracy.Highest,
  timeInterval: 1000,
  distanceInterval: 0,
};

class GpsEngine {
  constructor() {
    this.watchSubscription = null;
    this.locationTaskSubscription = null;
    this.isWatching = false;
    this.foregroundServiceActive = false;
    this.listeners = new Set();
    this.activeWatchOptions = null;
  }

  async requestForegroundPermission() {
    return requestForegroundLocationPermission();
  }

  async getCurrentLocation(options = {}) {
    return Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      ...options,
    });
  }

  async isLocationServiceEnabled() {
    return checkLocationServiceEnabled();
  }

  async checkLocationHealth() {
    const permission = await checkPermission();
    const servicesEnabled = await this.isLocationServiceEnabled();

    return {
      healthy: permission.granted && servicesEnabled,
      permission,
      servicesEnabled,
    };
  }

  async startWatching(options = {}) {
    if (this.isWatching) {
      return;
    }

    const permission = await this.requestForegroundPermission();

    if (!permission.granted) {
      throw new Error('Location permission is required to start GPS watching.');
    }

    const { foregroundService, ...locationOptions } = options;
    const watchOptions = {
      ...defaultWatchOptions,
      ...locationOptions,
    };

    this.activeWatchOptions = watchOptions;

    if (Platform.OS === 'android' && foregroundService) {
      if (isAndroidForegroundLocationSupported()) {
        this.locationTaskSubscription = subscribeToLocationTask((location) => {
          this.notify(location);
        });
        try {
          await startAndroidForegroundLocationUpdates(
            watchOptions,
            foregroundService
          );
          this.isWatching = true;
          this.foregroundServiceActive = true;
          return;
        } catch (error) {
          this.locationTaskSubscription();
          this.locationTaskSubscription = null;
          console.warn(
            'Failed to start Android foreground location service. Falling back to foreground-only GPS watching.',
            error
          );
        }
      }

      console.warn(
        'Android foreground location service is not available in Expo Go. Falling back to foreground-only GPS watching.'
      );
    }

    this.watchSubscription = await Location.watchPositionAsync(
      watchOptions,
      (location) => {
        this.notify(location);
      }
    );

    this.isWatching = true;
    this.foregroundServiceActive = false;
  }

  async stopWatching() {
    await stopAndroidForegroundLocationUpdates();

    if (this.locationTaskSubscription) {
      this.locationTaskSubscription();
      this.locationTaskSubscription = null;
    }

    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }

    this.activeWatchOptions = null;
    this.foregroundServiceActive = false;
    this.isWatching = false;
  }

  subscribe(callback) {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  notify(location) {
    this.listeners.forEach((callback) => {
      callback(location);
    });
  }

  getTrackingStatus() {
    return this.isWatching;
  }

  getForegroundServiceStatus() {
    return this.foregroundServiceActive;
  }
}

export default new GpsEngine();
