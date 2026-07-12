import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getOrCreateDeviceId } from '../services/device/deviceIdentityService';
import {
  getCurrentPlatform,
  getCurrentPlatformLabel,
  getDetectedDeviceName,
  isGenericDeviceName,
} from '../services/device/deviceMetadataService';
import {
  loadCachedDevices,
  saveCachedDevices,
} from '../services/cache/liveDataCacheService';
import {
  createOrUpdateDevice,
  getDevice,
  listDevices,
  subscribeToDevices,
} from '../services/firebase/deviceService';
import {
  logSecurityEvent,
  SECURITY_ACTIONS,
} from '../services/firebase/accountSecurityService';
import { APP_VERSION } from '../constants/app';
import { timestampToMillis } from '../utils/timestamp';
import { useAuth } from './AuthContext';

const DeviceContext = createContext(null);
const SELECTED_DEVICE_STORAGE_PREFIX = 'trackcam.selectedDeviceId';
const CURRENT_PLATFORM = getCurrentPlatform();
const PLATFORM_LABEL = getCurrentPlatformLabel();
const DEFAULT_DEVICE_NAME = getDetectedDeviceName();

function selectedDeviceStorageKey(uid) {
  return `${SELECTED_DEVICE_STORAGE_PREFIX}.${uid}`;
}

function getDeviceName(device) {
  return device?.name ?? device?.deviceName ?? null;
}

function sortDevices(deviceA, deviceB) {
  const nameA = getDeviceName(deviceA) ?? deviceA.deviceId ?? deviceA.id ?? '';
  const nameB = getDeviceName(deviceB) ?? deviceB.deviceId ?? deviceB.id ?? '';
  const nameComparison = nameA.localeCompare(nameB);

  if (nameComparison !== 0) {
    return nameComparison;
  }

  const idA = deviceA.deviceId ?? deviceA.id ?? '';
  const idB = deviceB.deviceId ?? deviceB.id ?? '';
  return idA.localeCompare(idB);
}

function normalizeDevice(device) {
  if (!device) {
    return null;
  }

  return {
    ...device,
    id: device.id ?? device.deviceId,
    deviceId: device.deviceId ?? device.id,
    name: getDeviceName(device),
  };
}

function normalizeDeviceList(devices) {
  const devicesById = new Map();

  devices.forEach((device) => {
    const normalizedDevice = normalizeDevice(device);
    const deviceId = normalizedDevice?.deviceId ?? normalizedDevice?.id;

    if (normalizedDevice?.status === 'deleted') {
      return;
    }

    if (deviceId && !devicesById.has(deviceId)) {
      devicesById.set(deviceId, normalizedDevice);
    }
  });

  return [...devicesById.values()].sort(sortDevices);
}

function hasDevice(devices, deviceId) {
  return devices.some((device) => {
    return device.deviceId === deviceId || device.id === deviceId;
  });
}

export function DeviceProvider({ children }) {
  const {
    loading: authLoading,
    logout,
    user,
    isAuthenticated,
  } = useAuth();
  const uid = user?.uid ?? null;
  const [localDeviceId, setLocalDeviceId] = useState(null);
  const [localDeviceName, setLocalDeviceNameState] = useState(DEFAULT_DEVICE_NAME);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [loading, setLoading] = useState(false);
  const pendingSelectedDeviceIdRef = useRef(null);
  const sessionStartedAtRef = useRef(Date.now());

  useEffect(() => {
    let isMounted = true;

    async function prepareLocalDevice() {
      if (authLoading) {
        return;
      }

      if (!isAuthenticated || !uid) {
        setLocalDeviceId(null);
        setSelectedDeviceId(null);
        pendingSelectedDeviceIdRef.current = null;
        setDevices([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const nextLocalDeviceId = await getOrCreateDeviceId();
        const [savedSelectedDeviceId, cachedDevices, existingDeviceResult] = await Promise.all([
          AsyncStorage.getItem(selectedDeviceStorageKey(uid)),
          loadCachedDevices(uid),
          getDevice(uid, nextLocalDeviceId)
            .then((device) => ({ device, resolved: true }))
            .catch(() => ({ device: null, resolved: false })),
        ]);

        if (!isMounted) {
          return;
        }

        setLocalDeviceId(nextLocalDeviceId);
        setSelectedDeviceId(nextLocalDeviceId);
        if (cachedDevices.length > 0) {
          const normalizedCachedDevices = normalizeDeviceList(cachedDevices);
          const cachedSelection =
            savedSelectedDeviceId && hasDevice(normalizedCachedDevices, savedSelectedDeviceId)
              ? savedSelectedDeviceId
              : hasDevice(normalizedCachedDevices, nextLocalDeviceId)
                ? nextLocalDeviceId
                : normalizedCachedDevices[0]?.deviceId ?? null;
          const cachedLocalDevice = normalizedCachedDevices.find((device) => {
            return device.deviceId === nextLocalDeviceId || device.id === nextLocalDeviceId;
          });

          setDevices(normalizedCachedDevices);
          setSelectedDeviceId(cachedSelection);
          if (getDeviceName(cachedLocalDevice)) {
            setLocalDeviceNameState(getDeviceName(cachedLocalDevice));
          }
        }
        pendingSelectedDeviceIdRef.current =
          savedSelectedDeviceId || nextLocalDeviceId;

        const cachedLocalDevice = cachedDevices.find((device) => {
          return device.deviceId === nextLocalDeviceId || device.id === nextLocalDeviceId;
        });
        const knownLocalName =
          getDeviceName(existingDeviceResult.device) ?? getDeviceName(cachedLocalDevice);
        const registrationData = {
          appVersion: APP_VERSION,
          lastActiveAt: new Date(),
          platform: CURRENT_PLATFORM,
          platformLabel: PLATFORM_LABEL,
          sessionStartedAt: new Date(sessionStartedAtRef.current),
          sessionStatus: 'active',
          trackingEnabled: true,
          status: 'active',
        };

        const canSafelySetDetectedName =
          existingDeviceResult.resolved || Boolean(cachedLocalDevice);
        if (canSafelySetDetectedName && isGenericDeviceName(knownLocalName)) {
          registrationData.name = DEFAULT_DEVICE_NAME;
          registrationData.deviceName = DEFAULT_DEVICE_NAME;
        }

        createOrUpdateDevice(uid, nextLocalDeviceId, registrationData)
          .then(() => {
            logSecurityEvent(uid, {
              action: SECURITY_ACTIONS.LOGIN,
              deviceId: nextLocalDeviceId,
              deviceName: registrationData.name ?? knownLocalName ?? DEFAULT_DEVICE_NAME,
              platform: CURRENT_PLATFORM,
            }).catch((logError) => {
              console.warn('Failed to log login event.', logError);
            });

            if (!existingDeviceResult.device) {
              logSecurityEvent(uid, {
                action: SECURITY_ACTIONS.ADD_DEVICE,
                deviceId: nextLocalDeviceId,
                deviceName: registrationData.name ?? knownLocalName ?? DEFAULT_DEVICE_NAME,
                platform: CURRENT_PLATFORM,
              }).catch((logError) => {
                console.warn('Failed to log device registration.', logError);
              });
            }
          })
          .catch((deviceError) => {
            console.warn('Failed to publish local device metadata.', deviceError);
          });
      } catch (deviceError) {
        console.warn('Failed to prepare local device.', deviceError);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    prepareLocalDevice();

    return () => {
      isMounted = false;
    };
  }, [authLoading, isAuthenticated, uid]);

  useEffect(() => {
    if (!uid || !localDeviceId) {
      return undefined;
    }

    let isCurrent = true;

    let unsubscribe = null;

    try {
      unsubscribe = subscribeToDevices(uid, (nextDevices, error) => {
        if (!isCurrent) {
          return;
        }

        if (error) {
          console.warn('Failed to subscribe to device list.', error);
          return;
        }

        const normalizedDevices = normalizeDeviceList(nextDevices);

        if (normalizedDevices.length === 0) {
          return;
        }

        setDevices(normalizedDevices);
        saveCachedDevices(uid, normalizedDevices);

        const localDevice = normalizedDevices.find((device) => {
          return device.deviceId === localDeviceId || device.id === localDeviceId;
        });

        const nextLocalDeviceName = getDeviceName(localDevice);
        if (nextLocalDeviceName) {
          setLocalDeviceNameState(nextLocalDeviceName);
        }

        const sessionRevokedAt = timestampToMillis(localDevice?.sessionRevokedAt);
        if (
          sessionRevokedAt &&
          sessionRevokedAt > sessionStartedAtRef.current &&
          localDevice?.sessionStatus === 'revoked'
        ) {
          console.warn('Local device session was revoked. Signing out.');
          logout().catch((logoutError) => {
            console.warn('Failed to sign out revoked local session.', logoutError);
          });
          return;
        }

        setSelectedDeviceId((currentSelectedDeviceId) => {
          const pendingSelectedDeviceId = pendingSelectedDeviceIdRef.current;

          if (
            pendingSelectedDeviceId &&
            hasDevice(normalizedDevices, pendingSelectedDeviceId)
          ) {
            pendingSelectedDeviceIdRef.current = null;
            return pendingSelectedDeviceId;
          }

          if (pendingSelectedDeviceId) {
            pendingSelectedDeviceIdRef.current = null;
          }

          if (
            currentSelectedDeviceId &&
            hasDevice(normalizedDevices, currentSelectedDeviceId)
          ) {
            return currentSelectedDeviceId;
          }

          if (localDeviceId && hasDevice(normalizedDevices, localDeviceId)) {
            return localDeviceId;
          }

          return normalizedDevices[0]?.deviceId ?? null;
        });
      });
    } catch (subscribeError) {
      console.warn('Failed to subscribe to device list.', subscribeError);
      return undefined;
    }

    return () => {
      isCurrent = false;
      unsubscribe?.();
    };
  }, [localDeviceId, logout, uid]);

  useEffect(() => {
    if (!uid || !selectedDeviceId || !hasDevice(devices, selectedDeviceId)) {
      return;
    }

    AsyncStorage.setItem(
      selectedDeviceStorageKey(uid),
      selectedDeviceId
    ).catch((error) => {
      console.warn('Failed to save selected device.', error);
    });
  }, [devices, selectedDeviceId, uid]);

  const refreshDevices = useCallback(async () => {
    if (!uid) {
      setDevices([]);
      return [];
    }

    const nextDevices = normalizeDeviceList(await listDevices(uid));
    setDevices(nextDevices);
    saveCachedDevices(uid, nextDevices);
    return nextDevices;
  }, [uid]);

  const selectDevice = useCallback((deviceId) => {
    if (!deviceId) {
      return;
    }

    setSelectedDeviceId(deviceId);
    pendingSelectedDeviceIdRef.current = null;
  }, []);

  const setLocalDeviceName = useCallback(async (name) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      throw new Error('Device name is required.');
    }

    if (uid && localDeviceId) {
      await createOrUpdateDevice(uid, localDeviceId, {
        name: trimmedName,
        deviceName: trimmedName,
        platform: CURRENT_PLATFORM,
        platformLabel: PLATFORM_LABEL,
        trackingEnabled: true,
        status: 'active',
      });

      logSecurityEvent(uid, {
        action: SECURITY_ACTIONS.RENAME_DEVICE,
        deviceId: localDeviceId,
        deviceName: trimmedName,
        platform: CURRENT_PLATFORM,
      }).catch((logError) => {
        console.warn('Failed to log device rename.', logError);
      });
    }

    setLocalDeviceNameState(trimmedName);
  }, [localDeviceId, uid]);

  const selectedDevice = useMemo(() => {
    return (
      devices.find((device) => {
        return (
          device.deviceId === selectedDeviceId ||
          device.id === selectedDeviceId
        );
      }) ?? null
    );
  }, [devices, selectedDeviceId]);

  const value = useMemo(
    () => ({
      localDeviceId,
      localDeviceName,
      devices,
      selectedDeviceId,
      selectedDevice,
      loading,
      selectDevice,
      refreshDevices,
      setLocalDeviceName,

      // Compatibility aliases while older screens are migrated.
      deviceId: localDeviceId,
      deviceName: localDeviceName,
      setDeviceName: setLocalDeviceName,
    }),
    [
      devices,
      loading,
      localDeviceId,
      localDeviceName,
      refreshDevices,
      selectDevice,
      selectedDevice,
      selectedDeviceId,
      setLocalDeviceName,
    ]
  );

  return (
    <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
  );
}

export function useDevice() {
  const context = useContext(DeviceContext);

  if (!context) {
    throw new Error('useDevice must be used inside DeviceProvider.');
  }

  return context;
}
