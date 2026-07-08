import { useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import Toast from 'react-native-toast-message';

import AppButton from '../components/AppButton';
import AppContainer from '../components/AppContainer';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase/firebaseConfig';

function showToast(type, message) {
  Toast.show({
    type,
    text1: message,
    visibilityTime: 3000,
  });
}

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  function closeLogin() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  function setFeedback(nextMessage, error = false) {
    setMessage(nextMessage);
    setIsError(error);
    showToast(error ? 'error' : 'success', nextMessage);
  }

  function hasLoginFields() {
    return email.trim() && password;
  }

  function hasRegisterFields() {
    return name.trim() && email.trim() && password && confirmPassword;
  }

  async function handleLogin() {
    if (!hasLoginFields()) {
      setFeedback('Email and password are required.', true);
      return;
    }

    try {
      setMessage('');
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setFeedback('Login successful.');
      closeLogin();
    } catch (error) {
      console.error('Login failed:', error);
      setFeedback('Login failed. Please check your email and password.', true);
    }
  }

  async function handleRegister() {
    if (!hasRegisterFields()) {
      setFeedback('Name, email, password, and confirm password are required.', true);
      return;
    }

    if (password !== confirmPassword) {
      setFeedback('Passwords do not match.', true);
      return;
    }

    try {
      setMessage('');
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      await updateProfile(credential.user, {
        displayName: name.trim(),
      });
      setFeedback('Register successful.');
      closeLogin();
    } catch (error) {
      console.error('Register failed:', error);
      setFeedback('Register failed. Please try another email or password.', true);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.wrapper}>
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
                  Name
                </AppText>
                <TextInput
                  autoCapitalize="words"
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={name}
                />
              </View>

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

              <View style={styles.field}>
                <AppText variant="caption" style={styles.label}>
                  Confirm Password
                </AppText>
                <TextInput
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
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
                  value={confirmPassword}
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
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
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
