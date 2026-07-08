import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
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
  const { loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="MainTabs">
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
        <Stack.Screen name="Personalization" component={PersonalizationScreen} />
        <Stack.Screen name="Loading" component={LoadingScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
