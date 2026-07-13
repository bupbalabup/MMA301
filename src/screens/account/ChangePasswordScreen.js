import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, SurfaceCard } from '../../components/ui';
import { useAuth, useDevice } from '../../contexts';
import {
  logSecurityEvent,
  SECURITY_ACTIONS,
} from '../../services/firebase/accountSecurityService';
import { colors, radius, spacing, typography } from '../../theme';

function PasswordField({ label, onChangeText, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={onChangeText}
        secureTextEntry
        style={styles.input}
        value={value}
      />
    </View>
  );
}

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const { changePassword, user } = useAuth();
  const { localDeviceId, localDeviceName, selectedDevice } = useDevice();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submitPasswordChange() {
    setMessage('');
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ mật khẩu.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      if (user?.uid) {
        await logSecurityEvent(user.uid, {
          action: SECURITY_ACTIONS.CHANGE_PASSWORD,
          deviceId: localDeviceId,
          deviceName: localDeviceName,
          platform: selectedDevice?.platform,
        });
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Đã đổi mật khẩu thành công.');
    } catch (changeError) {
      setError(changeError.message ?? 'Không thể đổi mật khẩu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Đổi mật khẩu</Text>
        <Text style={styles.description}>
          Nhập mật khẩu hiện tại để xác nhận trước khi đặt mật khẩu mới.
        </Text>

        <SurfaceCard style={styles.card}>
          <PasswordField
            label="Mật khẩu hiện tại"
            onChangeText={setCurrentPassword}
            value={currentPassword}
          />
          <PasswordField
            label="Mật khẩu mới"
            onChangeText={setNewPassword}
            value={newPassword}
          />
          <PasswordField
            label="Xác nhận mật khẩu mới"
            onChangeText={setConfirmPassword}
            value={confirmPassword}
          />
          <PrimaryButton
            disabled={loading}
            label={loading ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
            loading={loading}
            onPress={submitPasswordChange}
            style={styles.button}
          />
        </SurfaceCard>

        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: spacing.md,
  },
  card: {
    marginTop: spacing.md,
  },
  content: {
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  field: {
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
  },
  message: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.sm,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
});
