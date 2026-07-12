import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthRoutes } from '../constants/routes';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={AuthRoutes.Login}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name={AuthRoutes.Login} component={LoginScreen} />
      <Stack.Screen name={AuthRoutes.Register} component={RegisterScreen} />
    </Stack.Navigator>
  );
}
