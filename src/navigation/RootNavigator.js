import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts';
import { colors, spacing, typography } from '../theme';
import { BrandMark } from '../components/branding';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <BrandMark variant="horizontal" size={44} />
      <Text style={styles.loadingSubtext}>Đang khởi động...</Text>
    </View>
  );
}

export default function RootNavigator() {
  const { loading, isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      {loading ? (
        <LoadingScreen />
      ) : !isAuthenticated ? (
        <AuthNavigator />
      ) : (
        <AppNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingSubtext: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
