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
import { isRunningInExpoGo } from 'expo';
import { AppState, Platform } from 'react-native';

import {
  checkBatteryOptimizationStatus,
  checkNotificationPermission,
  getAutoStartStatus,
} from '../services/device/deviceSetupService';
import { refreshPermissionStatus } from '../services/location/locationPermissionService';

const PermissionSetupContext = createContext(null);
const SETUP_COMPLETED_KEY = 'trackcam.permissionSetup.completed.v1';

function isRequiredSetupReady(status) {
  if (!status?.foregroundPermission?.granted) {
    return false;
  }

  if (status.servicesEnabled !== true) {
    return false;
  }

  const backgroundUnsupportedInExpoGo = Platform.OS === 'ios' && isRunningInExpoGo();
  if (!backgroundUnsupportedInExpoGo && !status?.backgroundPermission?.granted) {
    return false;
  }

  if (
    Platform.OS === 'android' &&
    status?.notificationPermission?.required !== false &&
    !status?.notificationPermission?.granted
  ) {
    return false;
  }

  return true;
}

export function PermissionSetupProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [setupStatus, setSetupStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const appStateRef = useRef(AppState.currentState);
  const mountedRef = useRef(true);
  const refreshIdRef = useRef(0);
  const refreshPromiseRef = useRef(null);

  const refreshSetupStatus = useCallback(async ({ showLoading = false } = {}) => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshId = refreshIdRef.current + 1;
    refreshIdRef.current = refreshId;

    if (showLoading && mountedRef.current) {
      setLoading(true);
    }
    if (mountedRef.current) {
      setRefreshing(true);
      setRefreshError('');
    }

    const refreshPromise = Promise.all([
      refreshPermissionStatus({ backgroundRequired: true }),
      checkNotificationPermission(),
      checkBatteryOptimizationStatus(),
      getAutoStartStatus(),
    ])
      .then(([locationStatus, notificationPermission, batteryOptimization, autoStart]) => {
        const nextStatus = {
          ...locationStatus,
          autoStart,
          batteryOptimization,
          checkedAt: Date.now(),
          notificationPermission,
        };

        if (mountedRef.current && refreshId === refreshIdRef.current) {
          setSetupStatus(nextStatus);
        }

        return nextStatus;
      })
      .catch((error) => {
        if (mountedRef.current && refreshId === refreshIdRef.current) {
          setRefreshError(error.message ?? 'Không thể kiểm tra trạng thái thiết lập.');
        }
        throw error;
      })
      .finally(() => {
        if (mountedRef.current && refreshId === refreshIdRef.current) {
          setRefreshing(false);
          setLoading(false);
        }
        refreshPromiseRef.current = null;
      });

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    async function loadSetupState({ showLoading = false } = {}) {
      if (showLoading && mountedRef.current) {
        setLoading(true);
      }

      try {
        const [savedValue, nextStatus] = await Promise.all([
          AsyncStorage.getItem(SETUP_COMPLETED_KEY),
          refreshSetupStatus(),
        ]);

        if (mountedRef.current) {
          setCompleted(savedValue === 'true' && isRequiredSetupReady(nextStatus));
        }
      } catch (error) {
        console.warn('Failed to load permission setup state.', error);
        if (mountedRef.current) {
          setCompleted(false);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }

    loadSetupState({ showLoading: true });
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      if (nextState === 'active' && previousState !== 'active') {
        loadSetupState();
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.remove();
    };
  }, [refreshSetupStatus]);

  const completeSetup = useCallback(async () => {
    await AsyncStorage.setItem(SETUP_COMPLETED_KEY, 'true');
    setCompleted(true);
  }, []);

  const value = useMemo(
    () => ({
      completed,
      completeSetup,
      isRequiredSetupReady,
      loading,
      refreshError,
      refreshing,
      refreshSetupStatus,
      setupStatus,
    }),
    [
      completed,
      completeSetup,
      loading,
      refreshError,
      refreshing,
      refreshSetupStatus,
      setupStatus,
    ]
  );

  return (
    <PermissionSetupContext.Provider value={value}>
      {children}
    </PermissionSetupContext.Provider>
  );
}

export function usePermissionSetup() {
  const context = useContext(PermissionSetupContext);

  if (!context) {
    throw new Error('usePermissionSetup must be used inside PermissionSetupProvider.');
  }

  return context;
}
