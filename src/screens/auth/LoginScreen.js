import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthRoutes } from '../../constants/routes';
import { BrandMark } from '../../components/branding';
import { useAuth } from '../../contexts';
import { colors, radius, shadows, spacing, typography } from '../../theme';

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  async function handleLogin() {
    if (submitting) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Địa chỉ email không hợp lệ.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await login(trimmedEmail, password);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.container,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brandSection}>
            <BrandMark variant="horizontal" size={48} />
            <Text style={styles.brandSubtitle}>
              Theo dõi GPS tự động, mọi lúc mọi nơi
            </Text>
          </View>

          {/* Form card */}
          <View style={[styles.card, shadows.card]}>
            <Text style={styles.formTitle}>Đăng nhập</Text>

            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onBlur={() => setEmailFocused(false)}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, emailFocused && styles.inputFocused]}
                value={email}
              />
            </View>

            {/* Password field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mật khẩu</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  autoComplete="password"
                  onBlur={() => setPasswordFocused(false)}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  style={[
                    styles.input,
                    styles.passwordInput,
                    passwordFocused && styles.inputFocused,
                  ]}
                  value={password}
                />
                <Pressable
                  style={styles.visibilityToggle}
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <Text style={styles.visibilityText}>
                    {showPassword ? 'Ẩn' : 'Hiện'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Error message */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Login button */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                submitting && styles.buttonDisabled,
                pressed && !submitting && styles.buttonPressed,
              ]}
              onPress={handleLogin}
              disabled={submitting}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Text>
            </Pressable>
          </View>

          {/* Register link */}
          <Pressable
            style={({ pressed }) => [
              styles.linkButton,
              pressed && styles.linkButtonPressed,
            ]}
            onPress={() => navigation.navigate(AuthRoutes.Register)}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>Chưa có tài khoản? </Text>
            <Text style={styles.linkAction}>Tạo tài khoản</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.xxl,
  },
  brandSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    padding: spacing.xl,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.small,
    marginTop: spacing.sm,
    padding: spacing.sm + 2,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    lineHeight: 18,
  },
  fieldGroup: {
    marginTop: spacing.md,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  formTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  keyboardView: {
    flex: 1,
  },
  linkAction: {
    ...typography.button,
    color: colors.primary,
  },
  linkButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  linkButtonPressed: {
    opacity: 0.7,
  },
  linkText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  passwordInput: {
    flex: 1,
  },
  passwordRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    marginTop: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  visibilityText: {
    ...typography.button,
    color: colors.primary,
    minWidth: 36,
    textAlign: 'center',
  },
  visibilityToggle: {
    padding: spacing.xs,
  },
});
