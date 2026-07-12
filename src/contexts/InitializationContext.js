import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { initDatabase } from '../database';

const InitializationContext = createContext(null);

export function AppBootstrap({ children }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function initializeAppData() {
      try {
        await initDatabase();
      } catch (initializationError) {
        if (isMounted) {
          setError(initializationError);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAppData();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      loading,
      error,
      isReady: !loading && !error,
    }),
    [error, loading]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>Preparing Track Device...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Track Device could not start</Text>
        <Text style={styles.message}>{error.message}</Text>
      </View>
    );
  }

  return (
    <InitializationContext.Provider value={value}>
      {children}
    </InitializationContext.Provider>
  );
}

export function useInitialization() {
  const context = useContext(InitializationContext);

  if (!context) {
    throw new Error('useInitialization must be used inside AppBootstrap.');
  }

  return context;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});
