import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { INTERNET_RECHECK_INTERVAL_MS } from '../constants/network';
import { checkInternetConnection } from '../services/network/connectivityService';

const ConnectivityContext = createContext(null);

export function ConnectivityProvider({ children }) {
  const [isOnline, setIsOnline] = useState(null);
  const [checking, setChecking] = useState(false);
  const requestIdRef = useRef(0);

  const refreshConnectivity = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setChecking(true);

    const nextIsOnline = await checkInternetConnection();

    if (requestId === requestIdRef.current) {
      setIsOnline(nextIsOnline);
      setChecking(false);
    }

    return nextIsOnline;
  }, []);

  useEffect(() => {
    refreshConnectivity();

    const intervalId = setInterval(() => {
      if (AppState.currentState === 'active') {
        refreshConnectivity();
      }
    }, INTERNET_RECHECK_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshConnectivity();
      }
    });

    return () => {
      requestIdRef.current += 1;
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [refreshConnectivity]);

  const value = useMemo(
    () => ({
      checking,
      isOnline,
      status: checking && isOnline == null
        ? 'checking'
        : isOnline === true
          ? 'online'
          : 'offline',
      refreshConnectivity,
    }),
    [checking, isOnline, refreshConnectivity]
  );

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  const context = useContext(ConnectivityContext);

  if (!context) {
    throw new Error('useConnectivity must be used inside ConnectivityProvider.');
  }

  return context;
}
