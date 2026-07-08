import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import Toast from 'react-native-toast-message';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AIModeScreen from '../screens/AIModeScreen';
import LoadingScreen from '../screens/LoadingScreen';
import LoginScreen from '../screens/LoginScreen';
import PersonalizationScreen from '../screens/PersonalizationScreen';
import PreviewScreen from '../screens/PreviewScreen';
import ResultScreen from '../screens/ResultScreen';
import SplashScreen from '../screens/SplashScreen';
import StyleScreen from '../screens/StyleScreen';
import BottomTabNavigator from './BottomTabNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { loading, user } = useAuth();
  const { colors, mode } = useTheme();
  const previousUserRef = useRef(undefined);
  const baseNavigationTheme = mode === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseNavigationTheme,
    colors: {
      ...baseNavigationTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.secondary,
    },
  };

  useEffect(() => {
    if (loading) {
      return;
    }

    const previousUser = previousUserRef.current;

    if (previousUser && !user) {
      Toast.show({
        type: 'success',
        text1: 'Logout successful.',
        visibilityTime: 3000,
      });
    }

    previousUserRef.current = user;
  }, [loading, user]);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <>
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          initialRouteName="MainTabs"
          screenOptions={{
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: colors.surface,
            },
            headerTintColor: colors.text,
            headerTitleStyle: {
              color: colors.text,
            },
          }}
        >
          <Stack.Screen
            name="Splash"
            component={SplashScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MainTabs"
            component={BottomTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Preview" component={PreviewScreen} />
          <Stack.Screen name="AI Mode" component={AIModeScreen} />
          <Stack.Screen name="Style" component={StyleScreen} />
          <Stack.Screen
            name="Personalization"
            component={PersonalizationScreen}
          />
          <Stack.Screen name="Loading" component={LoadingScreen} />
          <Stack.Screen name="Result" component={ResultScreen} />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerBackTitle: 'Back', presentation: 'modal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </>
  );
}
