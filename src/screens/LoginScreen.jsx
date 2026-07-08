import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

import AppButton from '../components/AppButton';
import AppContainer from '../components/AppContainer';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase/firebaseConfig';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  function closeLogin() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  async function handleLogin() {
    try {
      setMessage('');
      await signInWithEmailAndPassword(auth, email, password);
      setMessage('Login successful.');
      setIsError(false);
      closeLogin();
    } catch (error) {
      setMessage('Login failed. Please check your email and password.');
      setIsError(true);
    }
  }

  async function handleRegister() {
    try {
      setMessage('');
      await createUserWithEmailAndPassword(auth, email, password);
      setMessage('Register successful.');
      setIsError(false);
      closeLogin();
    } catch (error) {
      setMessage('Register failed. Please try another email or password.');
      setIsError(true);
    }
  }

  return (
    <AppContainer>
      <View style={styles.inner}>
        <View style={styles.header}>
          <AppText variant="heading">Login / Register</AppText>
          <AppText variant="body" style={{ color: colors.textSecondary }}>
            Sign in to save your analyses and use favourites.
          </AppText>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <AppText variant="caption" style={styles.label}>
              Email
            </AppText>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={email}
            />
          </View>

          <View style={styles.field}>
            <AppText variant="caption" style={styles.label}>
              Password
            </AppText>
            <TextInput
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={password}
            />
          </View>
        </View>

        {message ? (
          <AppText
            variant="caption"
            style={{ color: isError ? colors.danger : colors.success }}
          >
            {message}
          </AppText>
        ) : null}

        <View style={styles.actions}>
          <AppButton title="Login" onPress={handleLogin} />
          <AppButton title="Register" onPress={handleRegister} />
        </View>
      </View>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    gap: 20,
    justifyContent: 'center',
  },
  header: {
    gap: 8,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontWeight: '600',
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    height: 56,
    paddingHorizontal: 16,
  },
  actions: {
    gap: 12,
  },
});
