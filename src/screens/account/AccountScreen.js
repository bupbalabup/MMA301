import { useEffect, useState } from 'react';
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
  updateUserAccountProfile,
} from '../../services/firebase/accountSecurityService';
import { colors, radius, spacing, typography } from '../../theme';
import { formatDateTime } from '../../utils/format';
import { getPlatformLabel } from './accountHelpers';

function Field({ editable = true, label, onChangeText, secureTextEntry, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        editable={editable}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
      />
    </View>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { changePassword, user } = useAuth();
  const { localDeviceId, localDeviceName, selectedDevice } = useDevice();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  const createdAt = user?.metadata?.creationTime
    ? formatDateTime(Date.parse(user.metadata.creationTime))
    : 'Chưa có dữ liệu';
  const lastLoginAt = user?.metadata?.lastSignInTime
    ? formatDateTime(Date.parse(user.metadata.lastSignInTime))
    : 'Chưa có dữ liệu';

  async function saveDisplayName() {
    if (!user?.uid) return;

    setSavingName(true);
    setMessage('');
    setError('');
    try {
      await updateUserAccountProfile(user.uid, {
        displayName: displayName.trim() || null,
      });
      setMessage('Đã lưu tên hiển thị.');
    } catch (saveError) {
      setError(saveError.message ?? 'Không thể lưu tên hiển thị.');
    } finally {
      setSavingName(false);
    }
  }

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

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      await logSecurityEvent(user.uid, {
        action: SECURITY_ACTIONS.CHANGE_PASSWORD,
        deviceId: localDeviceId,
        deviceName: localDeviceName,
        platform: selectedDevice?.platform,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Đã đổi mật khẩu thành công.');
    } catch (changeError) {
      setError(changeError.message ?? 'Không thể đổi mật khẩu.');
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Tài khoản</Text>

        <SurfaceCard style={styles.card}>
          <Field label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} />
          <Field editable={false} label="Email" value={user?.email ?? ''} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày tạo tài khoản</Text>
            <Text style={styles.infoValue}>{createdAt}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lần đăng nhập gần nhất</Text>
            <Text style={styles.infoValue}>{lastLoginAt}</Text>
          </View>
          <PrimaryButton
            disabled={savingName}
            label={savingName ? 'Đang lưu...' : 'Lưu tên hiển thị'}
            loading={savingName}
            onPress={saveDisplayName}
            style={styles.button}
          />
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <Text style={styles.sectionTitle}>Đổi mật khẩu</Text>
          <Field label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
          <Field label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          <Field label="Xác nhận mật khẩu mới" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          <PrimaryButton
            disabled={changingPassword}
            label={changingPassword ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
            loading={changingPassword}
            onPress={submitPasswordChange}
            style={styles.button}
          />
        </SurfaceCard>

        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <SurfaceCard style={styles.card}>
          <Text style={styles.sectionTitle}>Phiên hiện tại</Text>
          <Text style={styles.note}>Thiết bị: {localDeviceName || 'Thiết bị'}</Text>
          <Text style={styles.note}>Nền tảng: {getPlatformLabel(selectedDevice?.platform)}</Text>
        </SurfaceCard>
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
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  field: {
    marginBottom: spacing.md,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  infoRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  infoValue: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1.2,
    fontWeight: '700',
    textAlign: 'right',
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
  inputDisabled: {
    color: colors.textSecondary,
    opacity: 0.8,
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
  note: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
});
