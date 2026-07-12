import { createContext, useContext, useMemo } from 'react';

import { useFleetLiveLocations } from '../hooks/useFleetLiveLocations';
import { useAuth } from './AuthContext';
import { useDevice } from './DeviceContext';

const LiveDeviceContext = createContext(null);

export function LiveDeviceProvider({ children }) {
  const { user } = useAuth();
  const {
    devices,
    localDeviceId,
    selectedDeviceId,
  } = useDevice();
  const {
    errorsByDeviceId,
    fleetDevices,
    loading,
  } = useFleetLiveLocations({
    devices,
    localDeviceId,
    uid: user?.uid ?? null,
  });

  const value = useMemo(() => {
    const selectedFleetDevice = fleetDevices.find((fleetDevice) => {
      return fleetDevice.deviceId === selectedDeviceId;
    }) ?? null;

    return {
      errorsByDeviceId,
      fleetDevices,
      fleetLoading: loading,
      selectedFleetDevice,
      liveLocation: selectedFleetDevice?.liveLocation ?? null,
      loading,
      error: selectedFleetDevice?.error ?? '',
      isViewingLocalDevice:
        Boolean(selectedDeviceId) && selectedDeviceId === localDeviceId,
      isDeviceOnline: selectedFleetDevice?.isOnline ?? false,
      lastUpdateMs: selectedFleetDevice?.lastUpdateMs ?? null,
    };
  }, [errorsByDeviceId, fleetDevices, loading, localDeviceId, selectedDeviceId]);

  return (
    <LiveDeviceContext.Provider value={value}>
      {children}
    </LiveDeviceContext.Provider>
  );
}

export function useLiveDevice() {
  const context = useContext(LiveDeviceContext);

  if (!context) {
    throw new Error('useLiveDevice must be used inside LiveDeviceProvider.');
  }

  return context;
}
