import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabRoutes } from '../constants/routes';
import { TrackIcon } from '../components/icons';
import HistoryScreen from '../screens/history/HistoryScreen';
import HomeScreen from '../screens/main/HomeScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import FleetMapScreen from '../screens/tracking/FleetMapScreen';
import { colors, shadows, spacing, typography } from '../theme';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  [TabRoutes.HomeTab]: {
    accessibilityLabel: 'Mở Trang chủ',
    icon: 'dashboard',
    label: 'Trang chủ',
  },
  [TabRoutes.MapTab]: {
    accessibilityLabel: 'Mở Bản đồ',
    icon: 'liveMap',
    label: 'Bản đồ',
  },
  [TabRoutes.HistoryTab]: {
    accessibilityLabel: 'Mở Lịch sử',
    icon: 'history',
    label: 'Lịch sử',
  },
  [TabRoutes.SettingsTab]: {
    accessibilityLabel: 'Mở Cài đặt',
    icon: 'settings',
    label: 'Cài đặt',
  },
};

function createTabOptions(routeName) {
  const config = TAB_CONFIG[routeName];

  return {
    tabBarAccessibilityLabel: config.accessibilityLabel,
    tabBarIcon: ({ focused }) => (
      <TrackIcon
        name={config.icon}
        size={22}
        style={{
          opacity: focused ? 1 : 0.56,
          transform: [{ scale: focused ? 1.08 : 1 }],
        }}
      />
    ),
    tabBarLabel: config.label,
  };
}

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName={TabRoutes.HomeTab}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: {
          paddingVertical: spacing.xs,
        },
        tabBarLabelStyle: {
          ...typography.label,
          fontSize: 11,
        },
        tabBarStyle: {
          ...shadows.card,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          minHeight: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, spacing.xs),
          paddingTop: spacing.xs,
        },
      }}
    >
      <Tab.Screen
        name={TabRoutes.HomeTab}
        component={HomeScreen}
        options={createTabOptions(TabRoutes.HomeTab)}
      />
      <Tab.Screen
        name={TabRoutes.MapTab}
        component={FleetMapScreen}
        options={createTabOptions(TabRoutes.MapTab)}
      />
      <Tab.Screen
        name={TabRoutes.HistoryTab}
        component={HistoryScreen}
        options={createTabOptions(TabRoutes.HistoryTab)}
      />
      <Tab.Screen
        name={TabRoutes.SettingsTab}
        component={SettingsScreen}
        options={createTabOptions(TabRoutes.SettingsTab)}
      />
    </Tab.Navigator>
  );
}
