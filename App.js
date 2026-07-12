import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import RootNavigator from './src/navigation/RootNavigator';
import PermissionWizardScreen from './src/screens/setup/PermissionWizardScreen';
import { BrandMark } from './src/components/branding';
import { colors, spacing, typography } from './src/theme';
import {
  AppBootstrap,
  AuthProvider,
  ConnectivityProvider,
  DeviceProvider,
  LiveDeviceProvider,
  PermissionSetupProvider,
  TrackingProvider,
  useAuth,
  usePermissionSetup,
} from './src/contexts';

function VerifiedRuntime() {
  const { completed, loading } = usePermissionSetup();

  if (loading) {
    return (
      <View style={styles.loading}>
        <BrandMark variant="horizontal" size={44} />
        <Text style={styles.loadingText}>Đang kiểm tra thiết lập...</Text>
      </View>
    );
  }

  if (!completed) {
    return <PermissionWizardScreen />;
  }

  return (
    <DeviceProvider>
      <TrackingProvider>
        <LiveDeviceProvider>
          <RootNavigator />
        </LiveDeviceProvider>
      </TrackingProvider>
    </DeviceProvider>
  );
}

function AuthenticatedRuntime() {
  const { isAuthenticated, loading } = useAuth();

  if (loading || !isAuthenticated) {
    return <RootNavigator />;
  }

  return (
    <PermissionSetupProvider>
      <VerifiedRuntime />
    </PermissionSetupProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppBootstrap>
        <ConnectivityProvider>
          <AuthProvider>
            <AuthenticatedRuntime />
          </AuthProvider>
        </ConnectivityProvider>
      </AppBootstrap>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
