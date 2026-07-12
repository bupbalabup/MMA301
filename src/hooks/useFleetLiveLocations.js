import { useEffect, useMemo, useRef, useState } from 'react';

import { LIVE_CACHE_WRITE_INTERVAL_MS } from '../constants/network';
import { REMOTE_DEVICE_OFFLINE_TIMEOUT_MS } from '../constants/tracking';
import {
  loadCachedLiveLocations,
  saveCachedLiveLocations,
} from '../services/cache/liveDataCacheService';
import { subscribeToLiveLocation } from '../services/firebase/liveLocationService';
import { getLatestTimestampMs } from '../utils/timestamp';
import { getDeviceName } from '../utils/format';

function isValidCoordinate(liveLocation) {
  return (
    Number.isFinite(liveLocation?.latitude) &&
    Number.isFinite(liveLocation?.longitude) &&
    liveLocation.latitude >= -90 &&
    liveLocation.latitude <= 90 &&
    liveLocation.longitude >= -180 &&
    liveLocation.longitude <= 180
  );
}

function getLastUpdateMs(liveLocation, device) {
  return getLatestTimestampMs(
    liveLocation?.updatedAt,
    liveLocation?.recordedAt,
    device?.lastSeenAt,
    device?.updatedAt
  );
}

function selectNewestLocation(currentLocation, nextLocation) {
  if (!currentLocation) {
    return nextLocation;
  }

  const currentTimestamp = getLatestTimestampMs(
    currentLocation.updatedAt,
    currentLocation.recordedAt
  );
  const nextTimestamp = getLatestTimestampMs(
    nextLocation?.updatedAt,
    nextLocation?.recordedAt
  );

  if (!nextTimestamp || (currentTimestamp && nextTimestamp < currentTimestamp)) {
    return currentLocation;
  }

  return nextLocation;
}

export function useFleetLiveLocations({ devices, localDeviceId, uid }) {
  const [liveLocationsByDeviceId, setLiveLocationsByDeviceId] = useState({});
  const [errorsByDeviceId, setErrorsByDeviceId] = useState({});
  const [loading, setLoading] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const lastCacheWriteAtRef = useRef(0);
  const deviceIds = useMemo(() => {
    return [
      ...new Set(
        devices
          .map((device) => device.deviceId ?? device.id)
          .filter(Boolean)
      ),
    ].sort();
  }, [devices]);
  const deviceIdsKey = deviceIds.join('|');

  useEffect(() => {
    if (!uid || deviceIds.length === 0) {
      setLiveLocationsByDeviceId({});
      setErrorsByDeviceId({});
      setLoading(false);
      return undefined;
    }

    let isCurrent = true;
    const unsubscribers = [];
    setLoading(true);
    setErrorsByDeviceId({});
    setLiveLocationsByDeviceId((currentLocations) => {
      return Object.fromEntries(
        deviceIds
          .filter((deviceId) => currentLocations[deviceId])
          .map((deviceId) => [deviceId, currentLocations[deviceId]])
      );
    });

    loadCachedLiveLocations(uid).then((cachedLocations) => {
      if (!isCurrent) {
        return;
      }

      const cachedForCurrentDevices = Object.fromEntries(
        deviceIds
          .filter((deviceId) => cachedLocations[deviceId])
          .map((deviceId) => [deviceId, cachedLocations[deviceId]])
      );

      setLiveLocationsByDeviceId((currentLocations) => ({
        ...cachedForCurrentDevices,
        ...Object.fromEntries(
          Object.entries(currentLocations).map(([deviceId, currentLocation]) => [
            deviceId,
            selectNewestLocation(cachedForCurrentDevices[deviceId], currentLocation),
          ])
        ),
      }));
    });

    deviceIds.forEach((deviceId) => {
      try {
        const unsubscribe = subscribeToLiveLocation(
          uid,
          deviceId,
          (liveLocation, error) => {
            if (!isCurrent) {
              return;
            }

            if (error) {
              setErrorsByDeviceId((currentErrors) => ({
                ...currentErrors,
                [deviceId]: error.message,
              }));
            } else {
              if (liveLocation) {
                setLiveLocationsByDeviceId((currentLocations) => ({
                  ...currentLocations,
                  [deviceId]: selectNewestLocation(
                    currentLocations[deviceId],
                    liveLocation
                  ),
                }));
              }
            }

            setLoading(false);
          }
        );

        unsubscribers.push(unsubscribe);
      } catch (error) {
        setErrorsByDeviceId((currentErrors) => ({
          ...currentErrors,
          [deviceId]: error.message,
        }));
        setLoading(false);
      }
    });

    return () => {
      isCurrent = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe?.());
    };
  }, [deviceIdsKey, uid]);

  useEffect(() => {
    if (!uid || Object.keys(liveLocationsByDeviceId).length === 0) {
      return undefined;
    }

    const elapsedMs = Date.now() - lastCacheWriteAtRef.current;
    const delayMs = Math.max(0, LIVE_CACHE_WRITE_INTERVAL_MS - elapsedMs);
    const timeoutId = setTimeout(() => {
      lastCacheWriteAtRef.current = Date.now();
      const cacheNow = Date.now();
      const cacheLocations = Object.fromEntries(
        Object.entries(liveLocationsByDeviceId).map(([deviceId, location]) => {
          const lastUpdateMs = getLatestTimestampMs(
            location?.updatedAt,
            location?.recordedAt
          );
          const isFresh = lastUpdateMs
            ? cacheNow - lastUpdateMs <= REMOTE_DEVICE_OFFLINE_TIMEOUT_MS
            : false;
          const offlineSince = isFresh
            ? null
            : timestampForOffline(location, lastUpdateMs);

          const device = devices.find((item) => {
            return (item.deviceId ?? item.id) === deviceId;
          });

          return [
            deviceId,
            {
              ...location,
              deviceName: getDeviceName(device),
              markerColor: device?.markerColor ?? null,
              platform: device?.platform ?? null,
              connectionStatus: isFresh ? 'Online' : 'Offline',
              lastOnlineAt: isFresh ? lastUpdateMs : location?.lastOnlineAt ?? lastUpdateMs,
              offlineSince,
            },
          ];
        })
      );
      saveCachedLiveLocations(uid, cacheLocations);
    }, delayMs);

    return () => clearTimeout(timeoutId);
  }, [deviceIdsKey, devices, liveLocationsByDeviceId, uid]);

  useEffect(() => {
    const timerId = setInterval(() => {
      setNowMs(Date.now());
    }, 10000);

    return () => {
      clearInterval(timerId);
    };
  }, []);

  const fleetDevices = useMemo(() => {
    return devices.map((device) => {
      const deviceId = device.deviceId ?? device.id;
      const liveLocation = liveLocationsByDeviceId[deviceId] ?? null;
      const lastUpdateMs = getLastUpdateMs(liveLocation, device);
      const isOnline = lastUpdateMs
        ? nowMs - lastUpdateMs <= REMOTE_DEVICE_OFFLINE_TIMEOUT_MS
        : false;
      const offlineSince = isOnline
        ? null
        : timestampForOffline(liveLocation, lastUpdateMs);

      return {
        device,
        deviceId,
        markerColor: device?.markerColor ?? null,
        name: getDeviceName(device),
        liveLocation,
        error: errorsByDeviceId[deviceId] ?? '',
        hasValidCoordinate: isValidCoordinate(liveLocation),
        isLocalDevice: deviceId === localDeviceId,
        isOnline,
        lastUpdateMs,
        lastOnlineAt: isOnline
          ? lastUpdateMs
          : liveLocation?.lastOnlineAt ?? lastUpdateMs,
        offlineSince,
        lostConnectionDurationMs: offlineSince
          ? Math.max(0, nowMs - offlineSince)
          : null,
      };
    });
  }, [
    devices,
    errorsByDeviceId,
    liveLocationsByDeviceId,
    localDeviceId,
    nowMs,
  ]);

  return {
    errorsByDeviceId,
    fleetDevices,
    loading,
  };
}

function timestampForOffline(location, lastUpdateMs) {
  const cachedOfflineSince = getLatestTimestampMs(location?.offlineSince);
  if (cachedOfflineSince) {
    return cachedOfflineSince;
  }

  return lastUpdateMs
    ? lastUpdateMs + REMOTE_DEVICE_OFFLINE_TIMEOUT_MS
    : null;
}
