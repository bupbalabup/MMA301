import AsyncStorage from '@react-native-async-storage/async-storage';

import { timestampToMillis } from '../../utils/timestamp';

const DEVICES_CACHE_PREFIX = 'trackcam.cache.devices';
const LIVE_LOCATIONS_CACHE_PREFIX = 'trackcam.cache.liveLocations';

function cacheKey(prefix, uid) {
  return `${prefix}.${uid}`;
}

async function readJson(key, fallback) {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn('[Cache] Failed to read cached data.', error);
    return fallback;
  }
}

async function writeJson(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('[Cache] Failed to save cached data.', error);
  }
}

export function loadCachedDevices(uid) {
  if (!uid) {
    return Promise.resolve([]);
  }

  return readJson(cacheKey(DEVICES_CACHE_PREFIX, uid), []).then((devices) => {
    return Array.isArray(devices) ? devices : [];
  });
}

export function saveCachedDevices(uid, devices) {
  if (!uid || !Array.isArray(devices)) {
    return Promise.resolve();
  }

  return writeJson(cacheKey(DEVICES_CACHE_PREFIX, uid), devices);
}

export async function clearDisplayCache(uid) {
  if (!uid) {
    return;
  }

  await Promise.all([
    AsyncStorage.removeItem(cacheKey(DEVICES_CACHE_PREFIX, uid)),
    AsyncStorage.removeItem(cacheKey(LIVE_LOCATIONS_CACHE_PREFIX, uid)),
  ]);
}

export function loadCachedLiveLocations(uid) {
  if (!uid) {
    return Promise.resolve({});
  }

  return readJson(cacheKey(LIVE_LOCATIONS_CACHE_PREFIX, uid), {}).then((cached) => {
    if (!cached || typeof cached !== 'object' || Array.isArray(cached)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(cached)
        .filter(([deviceId, location]) => deviceId && location && typeof location === 'object')
        .map(([deviceId, location]) => [
          deviceId,
          {
            ...location,
            deviceId,
            deviceName: location.deviceName ?? location.name ?? null,
            platform: location.platform ?? null,
            speedKmh: location.speedKmh ?? location.currentSpeedKmh,
            currentSpeedKmh: location.currentSpeedKmh ?? location.speedKmh,
            activeTripMaxSpeedKmh:
              location.activeTripMaxSpeedKmh ?? location.maxSpeedKmh,
            maxSpeedKmh:
              location.maxSpeedKmh ?? location.activeTripMaxSpeedKmh,
            updatedAt: timestampToMillis(location.updatedAt ?? location.lastUpdatedAt),
            lastUpdatedAt: timestampToMillis(location.lastUpdatedAt ?? location.updatedAt),
            recordedAt: timestampToMillis(location.recordedAt),
            lastOnlineAt: timestampToMillis(location.lastOnlineAt),
            offlineSince: timestampToMillis(location.offlineSince),
          },
        ])
    );
  });
}

export function saveCachedLiveLocations(uid, locationsByDeviceId) {
  if (!uid || !locationsByDeviceId) {
    return Promise.resolve();
  }

  const displayLocations = Object.fromEntries(
    Object.entries(locationsByDeviceId).map(([deviceId, location]) => [
      deviceId,
      {
        deviceId,
        deviceName: location?.deviceName ?? location?.name ?? null,
        platform: location?.platform ?? null,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        speedKmh: location?.speedKmh ?? location?.currentSpeedKmh ?? null,
        currentSpeedKmh: location?.currentSpeedKmh ?? location?.speedKmh ?? null,
        activeTripMaxSpeedKmh:
          location?.activeTripMaxSpeedKmh ?? location?.maxSpeedKmh ?? null,
        maxSpeedKmh:
          location?.maxSpeedKmh ?? location?.activeTripMaxSpeedKmh ?? null,
        stoppedDurationMs: location?.stoppedDurationMs ?? null,
        movementStatus: location?.movementStatus ?? location?.status ?? null,
        connectionStatus: location?.connectionStatus ?? null,
        updatedAt: timestampToMillis(location?.updatedAt ?? location?.lastUpdatedAt),
        lastUpdatedAt: timestampToMillis(location?.lastUpdatedAt ?? location?.updatedAt),
        recordedAt: timestampToMillis(location?.recordedAt),
        lastOnlineAt: timestampToMillis(location?.lastOnlineAt),
        offlineSince: timestampToMillis(location?.offlineSince),
        pausedSince: timestampToMillis(location?.pausedSince),
        parkingStartedAt: timestampToMillis(location?.parkingStartedAt),
        address: location?.address ?? null,
        todayDistanceKm: location?.todayDistanceKm ?? null,
        batteryLevel: Number.isFinite(location?.batteryLevel)
          ? location.batteryLevel
          : null,
        source: 'cache',
      },
    ])
  );

  return writeJson(cacheKey(LIVE_LOCATIONS_CACHE_PREFIX, uid), displayLocations);
}
