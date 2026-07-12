import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  configureTrackingNotification,
  disableTracking as disableTrackingEngine,
  enableTracking as enableTrackingEngine,
  getState,
  initialize,
  shutdown,
  syncPendingTrips,
  subscribeToState,
} from '../services/tracking';
import { useAuth } from './AuthContext';
import { useConnectivity } from './ConnectivityContext';
import { useDevice } from './DeviceContext';

const TrackingContext = createContext(null);

export function TrackingProvider({ children }) {
  const { loading: authLoading, user } = useAuth();
  const { isOnline } = useConnectivity();
  const {
    localDeviceId,
    localDeviceName,
    loading: deviceLoading,
  } = useDevice();
  const uid = user?.uid ?? null;
  const [trackingState, setTrackingState] = useState(getState());
  const activeContextKeyRef = useRef(null);
  const previousOnlineRef = useRef(isOnline);

  useEffect(() => {
    const unsubscribe = subscribeToState((nextState) => {
      setTrackingState(nextState);
    });

    setTrackingState(getState());

    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => {
      console.log(
        '[TrackingContext] cleanup reason: provider unmounted (React unmount or Fast Refresh)'
      );
      shutdown('provider unmounted (React unmount or Fast Refresh)').catch((error) => {
        console.warn('Failed to shutdown tracking.', error);
      });
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function prepareTracking() {
      if (authLoading || deviceLoading) {
        return;
      }

      if (!uid) {
        activeContextKeyRef.current = null;
        const currentState = getState();

        if (currentState.isInitialized || currentState.isEnabled) {
          console.log('[TrackingContext] cleanup reason: user logged out');
          await shutdown('user logged out');
        }

        setTrackingState(getState());
        return;
      }

      if (!localDeviceId) {
        return;
      }

      const contextKey = `${uid}:${localDeviceId}`;

      if (activeContextKeyRef.current === contextKey) {
        return;
      }

      try {
        if (activeContextKeyRef.current) {
          const [previousUid, previousLocalDeviceId] =
            activeContextKeyRef.current.split(':');
          const cleanupReason =
            previousUid !== uid
              ? 'authenticated user changed'
              : previousLocalDeviceId !== localDeviceId
                ? 'local device changed'
                : 'tracking context changed';

          console.log(`[TrackingContext] cleanup reason: ${cleanupReason}`);
          await shutdown(cleanupReason);

          if (isCancelled) {
            return;
          }
        }

        console.log(`[TrackingContext] initialize reason: context ${contextKey}`);
        await initialize({
          uid,
          deviceId: localDeviceId,
        }, 'stable uid/deviceId pair');

        if (isCancelled) {
          return;
        }

        await enableTrackingEngine('auto-enable after initialize');

        if (isCancelled) {
          return;
        }

        if (isOnline === true) {
          syncPendingTrips(uid, localDeviceId).catch((error) => {
            console.warn('Failed to sync pending trips.', error);
          });
        }

        activeContextKeyRef.current = contextKey;
        setTrackingState(getState());
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.warn('Failed to initialize tracking.', error);
        activeContextKeyRef.current = null;
        setTrackingState(getState());
      }
    }

    prepareTracking();

    return () => {
      isCancelled = true;
    };
  }, [authLoading, deviceLoading, isOnline, localDeviceId, uid]);

  useEffect(() => {
    const wasOnline = previousOnlineRef.current;
    previousOnlineRef.current = isOnline;

    if (
      wasOnline === true ||
      isOnline !== true ||
      !uid ||
      !localDeviceId ||
      activeContextKeyRef.current !== `${uid}:${localDeviceId}`
    ) {
      return;
    }

    syncPendingTrips(uid, localDeviceId).catch((error) => {
      console.warn('Failed to retry pending trips after reconnecting.', error);
    });
  }, [isOnline, localDeviceId, uid]);

  useEffect(() => {
    configureTrackingNotification({
      deviceName: localDeviceName,
      isNetworkOnline: isOnline !== false,
    });
  }, [isOnline, localDeviceName]);

  const enableTracking = useCallback(async () => {
    try {
      if (uid && localDeviceId) {
        console.log(`[TrackingContext] initialize reason: manual enable ${uid}:${localDeviceId}`);
        await initialize({
          uid,
          deviceId: localDeviceId,
        }, 'manual enable with stable context');
      }

      await enableTrackingEngine('explicit user action');
    } catch (error) {
      console.warn('Failed to enable tracking.', error);
    } finally {
      setTrackingState(getState());
    }
  }, [localDeviceId, uid]);

  const disableTracking = useCallback(async () => {
    try {
      await disableTrackingEngine('explicit user action');
    } catch (error) {
      console.warn('Failed to disable tracking.', error);
    } finally {
      setTrackingState(getState());
    }
  }, []);

  const value = useMemo(
    () => {
      const connectionStatus =
        isOnline === false ? 'Offline' : trackingState.connectionStatus;

      return ({
      trackingState,
      status: trackingState.status,
      movementStatus: trackingState.movementStatus,
      connectionStatus,
      isTrackingEnabled: trackingState.isEnabled,
      currentSpeedKmh: trackingState.currentSpeedKmh ?? 0,
      activeTripMaxSpeedKmh: trackingState.activeTripMaxSpeedKmh ?? 0,
      todayDistanceKm: trackingState.todayDistanceKm ?? 0,
      stoppedDurationMs: trackingState.stoppedDurationMs ?? 0,
      stoppedSince: trackingState.stoppedSince ?? null,
      enableTracking,
      disableTracking,
    });
    },
    [disableTracking, enableTracking, isOnline, trackingState]
  );

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  const context = useContext(TrackingContext);

  if (!context) {
    throw new Error('useTracking must be used inside TrackingProvider.');
  }

  return context;
}
