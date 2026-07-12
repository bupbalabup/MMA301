import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import { DangerButton, SecondaryButton } from '../ui';

export default function PasswordConfirmModal({
  error,
  loading = false,
  onCancel,
  onConfirm,
  title = 'Nhập mật khẩu để xác nhận.',
  visible,
}) {
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!visible) {
      setPassword('');
    }
  }, [visible]);

  function handleConfirm() {
    onConfirm(password);
  }

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>
            Thao tác này yêu cầu xác nhận lại mật khẩu tài khoản.
          </Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Mật khẩu"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={styles.input}
            value={password}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <SecondaryButton
              disabled={loading}
              label="Hủy"
              onPress={onCancel}
              style={styles.actionButton}
            />
            <DangerButton
              disabled={!password.trim() || loading}
              label={loading ? 'Đang xác nhận...' : 'Xác nhận'}
              loading={loading}
              onPress={handleConfirm}
              style={styles.actionButton}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng"
            onPress={onCancel}
            style={styles.closeArea}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    padding: spacing.lg,
    width: '100%',
  },
  closeArea: {
    height: 1,
    width: 1,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
  },
  title: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
});
