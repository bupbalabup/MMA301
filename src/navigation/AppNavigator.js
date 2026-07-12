import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text } from 'react-native';

import { MainRoutes } from '../constants/routes';
import { colors, spacing, typography } from '../theme';
import { TrackIcon } from '../components/icons';
import AccountScreen from '../screens/account/AccountScreen';
import MyDevicesScreen from '../screens/account/MyDevicesScreen';
import NotificationPreferencesScreen from '../screens/account/NotificationPreferencesScreen';
import SecurityLogScreen from '../screens/account/SecurityLogScreen';
import SignedInDevicesScreen from '../screens/account/SignedInDevicesScreen';
import SyncStatusScreen from '../screens/account/SyncStatusScreen';
import HistoryScreen from '../screens/history/HistoryScreen';
import TripDetailScreen from '../screens/history/TripDetailScreen';
import HomeScreen from '../screens/main/HomeScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import PermissionWizardScreen from '../screens/setup/PermissionWizardScreen';
import FleetMapScreen from '../screens/tracking/FleetMapScreen';
import LiveTrackingScreen from '../screens/tracking/LiveTrackingScreen';
import PlaybackScreen from '../screens/tracking/PlaybackScreen';

const Stack = createNativeStackNavigator();

/** Shared header styling applied to every screen in the main stack. */
function createScreenOptions({ navigation }) {
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(MainRoutes.Dashboard);
  };

  return {
    headerStyle: {
      backgroundColor: colors.surface,
    },
    headerBackVisible: false,
    headerTintColor: colors.primary,
    headerTitleStyle: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 17,
    },
    headerLeft: ({ canGoBack }) =>
      canGoBack ? (
        <Pressable
          onPress={handleGoBack}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={6}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <TrackIcon name="back" size={20} />
          <Text style={styles.backButtonText}>Quay lại</Text>
        </Pressable>
      ) : null,
    headerShadowVisible: true,
  };
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={MainRoutes.Dashboard}
      screenOptions={createScreenOptions}
    >
      <Stack.Screen
        name={MainRoutes.Dashboard}
        component={HomeScreen}
        options={{ title: 'Track Device', headerShown: false }}
      />
      <Stack.Screen
        name={MainRoutes.LiveTracking}
        component={LiveTrackingScreen}
        options={{ title: 'Theo dõi trực tiếp' }}
      />
      <Stack.Screen
        name={MainRoutes.FleetMap}
        component={FleetMapScreen}
        options={{ title: 'Bản đồ thiết bị' }}
      />
      <Stack.Screen
        name={MainRoutes.Account}
        component={AccountScreen}
        options={{ title: 'Tài khoản' }}
      />
      <Stack.Screen
        name={MainRoutes.SignedInDevices}
        component={SignedInDevicesScreen}
        options={{ title: 'Thiết bị đang đăng nhập' }}
      />
      <Stack.Screen
        name={MainRoutes.MyDevices}
        component={MyDevicesScreen}
        options={{ title: 'Thiết bị của tôi' }}
      />
      <Stack.Screen
        name={MainRoutes.NotificationPreferences}
        component={NotificationPreferencesScreen}
        options={{ title: 'Thông báo' }}
      />
      <Stack.Screen
        name={MainRoutes.SyncStatus}
        component={SyncStatusScreen}
        options={{ title: 'Đồng bộ' }}
      />
      <Stack.Screen
        name={MainRoutes.SecurityLog}
        component={SecurityLogScreen}
        options={{ title: 'Nhật ký hoạt động' }}
      />
      <Stack.Screen
        name={MainRoutes.History}
        component={HistoryScreen}
        options={{ title: 'Lịch sử hành trình' }}
      />
      <Stack.Screen
        name={MainRoutes.TripDetail}
        component={TripDetailScreen}
        options={{ title: 'Chi tiết chuyến đi' }}
      />
      <Stack.Screen
        name={MainRoutes.Playback}
        component={PlaybackScreen}
        options={{ title: 'Bản đồ hành trình' }}
      />
      <Stack.Screen
        name={MainRoutes.PermissionSetup}
        component={PermissionWizardScreen}
        options={{ title: 'Thiết lập theo dõi' }}
      />
      <Stack.Screen
        name={MainRoutes.Settings}
        component={SettingsScreen}
        options={{ title: 'Cài đặt' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    ...typography.button,
    color: colors.primary,
  },
});
