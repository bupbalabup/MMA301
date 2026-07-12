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

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  async function handleRegister() {
    if (submitting) {
      return;
    }

    const nextErrors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      nextErrors.email = 'Vui lòng nhập email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Địa chỉ email không hợp lệ.';
    }
    if (!password) {
      nextErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (password.length < 6) {
      nextErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await register(trimmedEmail, password);
    } catch (registerError) {
      setError(registerError.message);
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
              Tạo tài khoản để bắt đầu theo dõi GPS
            </Text>
          </View>

          {/* Form card */}
          <View style={[styles.card, shadows.card]}>
            <Text style={styles.formTitle}>Tạo tài khoản</Text>

            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onBlur={() => setEmailFocused(false)}
                onChangeText={(value) => {
                  setEmail(value);
                  setFieldErrors((current) => ({ ...current, email: '' }));
                }}
                onFocus={() => setEmailFocused(true)}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, emailFocused && styles.inputFocused]}
                value={email}
              />
              {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}
            </View>

            {/* Password field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mật khẩu</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  autoComplete="new-password"
                  onBlur={() => setPasswordFocused(false)}
                  onChangeText={(value) => {
                    setPassword(value);
                    setFieldErrors((current) => ({ ...current, password: '', confirmPassword: '' }));
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  placeholder="Tối thiểu 6 ký tự"
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
              <Text style={styles.hint}>Sử dụng ít nhất 6 ký tự</Text>
              {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nhập lại mật khẩu</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  autoComplete="new-password"
                  onBlur={() => setConfirmPasswordFocused(false)}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    setFieldErrors((current) => ({ ...current, confirmPassword: '' }));
                  }}
                  onFocus={() => setConfirmPasswordFocused(true)}
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  style={[
                    styles.input,
                    styles.passwordInput,
                    confirmPasswordFocused && styles.inputFocused,
                  ]}
                  value={confirmPassword}
                />
                <Pressable
                  style={styles.visibilityToggle}
                  onPress={() => setShowConfirmPassword((value) => !value)}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Ẩn mật khẩu nhập lại' : 'Hiện mật khẩu nhập lại'}
                >
                  <Text style={styles.visibilityText}>
                    {showConfirmPassword ? 'Ẩn' : 'Hiện'}
                  </Text>
                </Pressable>
              </View>
              {fieldErrors.confirmPassword ? <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text> : null}
            </View>

            {/* Error message */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Register button */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                submitting && styles.buttonDisabled,
                pressed && !submitting && styles.buttonPressed,
              ]}
              onPress={handleRegister}
              disabled={submitting}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
              </Text>
            </Pressable>
          </View>

          {/* Back to login link */}
          <Pressable
            style={({ pressed }) => [
              styles.linkButton,
              pressed && styles.linkButtonPressed,
            ]}
            onPress={() => navigation.navigate(AuthRoutes.Login)}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>Đã có tài khoản? </Text>
            <Text style={styles.linkAction}>Đăng nhập</Text>
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
  fieldError: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
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
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
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
