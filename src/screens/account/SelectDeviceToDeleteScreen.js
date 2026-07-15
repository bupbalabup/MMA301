import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import PasswordConfirmModal from '../../components/security/PasswordConfirmModal';
import { SurfaceCard } from '../../components/ui';
import { useAuth, useDevice, useTracking } from '../../contexts';
import {
  logSecurityEvent,
  SECURITY_ACTIONS,
  softDeleteDevice,
} from '../../services/firebase/accountSecurityService';
import { colors, spacing, typography } from '../../theme';
import {
  getDeviceDisplayName,
  getPlatformLabel,
} from './accountHelpers';

export default function SelectDeviceToDeleteScreen() {
  const insets = useSafeAreaInsets();
  const { confirmPassword, logout, user } = useAuth();
  const {
    devices,
    loading,
    localDeviceId,
    localDeviceName,
    refreshDevices,
  } = useDevice();
  const { isTrackingEnabled } = useTracking();
  const [selectedDeleteDevice, setSelectedDeleteDevice] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const visibleDevices = useMemo(() => {
    return devices.filter((device) => device.status !== 'deleted');
  }, [devices]);

  function beginDelete(device) {
    setError('');
    setMessage('');
    setConfirmError('');
    setSelectedDeleteDevice(device);

    if (device.deviceId === localDeviceId && isTrackingEnabled) {
      setError('Hãy tắt theo dõi trước khi xóa thiết bị hiện tại.');
      setSelectedDeleteDevice(null);
      return;
    }

    setConfirmVisible(true);
  }

  async function performDelete(device) {
    try {
      await softDeleteDevice(user.uid, device.deviceId);
      await logSecurityEvent(user.uid, {
        action: SECURITY_ACTIONS.DELETE_DEVICE,
        deviceId: localDeviceId,
        deviceName: localDeviceName,
        platform: Platform.OS,
        targetDeviceId: device.deviceId,
        targetDeviceName: getDeviceDisplayName(device),
      });
      await refreshDevices();

      if (device.deviceId === localDeviceId) {
        await logout();
        return;
      }

      setMessage('Đã xóa thiết bị khỏi tài khoản.');
      setSelectedDeleteDevice(null);
      setConfirmVisible(false);
    } catch (deleteError) {
      setConfirmError(deleteError.message ?? 'Không thể xóa thiết bị.');
      setConfirmVisible(true);
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleConfirm(password) {
    if (!user?.uid || !selectedDeleteDevice?.deviceId) return;

    setConfirmLoading(true);
    setConfirmError('');

    try {
      await confirmPassword(password);
      setConfirmVisible(false);

      const warning = selectedDeleteDevice.deviceId === localDeviceId
        ? 'Bạn đang xóa thiết bị hiện tại. Thiết bị này sẽ đăng xuất sau khi xóa.'
        : 'Thiết bị này sẽ bị xóa khỏi tài khoản. Tài khoản của bạn không bị xóa.';

      Alert.alert(
        'Xác nhận xóa thiết bị',
        warning,
        [
          {
            text: 'Hủy',
            style: 'cancel',
            onPress: () => {
              setConfirmLoading(false);
              setSelectedDeleteDevice(null);
            },
          },
          {
            text: 'Xóa thiết bị',
            style: 'destructive',
            onPress: () => performDelete(selectedDeleteDevice),
          },
        ],
        { cancelable: false }
      );
    } catch (deleteError) {
      setConfirmError(deleteError.message ?? 'Không thể xác nhận mật khẩu.');
      setConfirmLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Chỉ chọn thiết bị khi bạn thật sự muốn xóa khỏi tài khoản.
        </Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading && visibleDevices.length === 0 ? (
          <SurfaceCard style={styles.card}>
            <Text style={styles.emptyText}>Đang tải thiết bị...</Text>
          </SurfaceCard>
        ) : null}

        {!loading && visibleDevices.length === 0 ? (
          <SurfaceCard style={styles.card}>
            <Text style={styles.emptyTitle}>Không có thiết bị</Text>
            <Text style={styles.emptyText}>Thiết bị trong tài khoản sẽ xuất hiện tại đây.</Text>
          </SurfaceCard>
        ) : null}

        {visibleDevices.map((device) => {
          const isCurrentDevice = device.deviceId === localDeviceId;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Chọn ${getDeviceDisplayName(device)} để xóa`}
              key={device.deviceId}
              onPress={() => beginDelete(device)}
              style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
            >
              <SurfaceCard>
                <View style={styles.cardHeader}>
                  <Text style={styles.deviceName}>{getDeviceDisplayName(device)}</Text>
                  {isCurrentDevice ? <Text style={styles.currentBadge}>Thiết bị hiện tại</Text> : null}
                </View>
                <Text style={styles.metaText}>{getPlatformLabel(device.platform)}</Text>
                <Text style={styles.warningText}>
                  Xóa thiết bị không xóa tài khoản và không xóa lịch sử của thiết bị khác.
                </Text>
              </SurfaceCard>
            </Pressable>
          );
        })}
      </ScrollView>

      <PasswordConfirmModal
        error={confirmError}
        loading={confirmLoading}
        onCancel={() => {
          if (!confirmLoading) {
            setConfirmVisible(false);
            setSelectedDeleteDevice(null);
            setConfirmError('');
          }
        }}
        onConfirm={handleConfirm}
        title="Nhập mật khẩu để xác nhận."
        visible={confirmVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  cardHeader: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardPressable: {
    marginTop: spacing.md,
  },
  content: {
    padding: spacing.lg,
  },
  currentBadge: {
    ...typography.caption,
    alignSelf: 'flex-start',
    color: colors.primary,
    fontWeight: '700',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  deviceName: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  message: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.78,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  warningText: {
    ...typography.caption,
    color: colors.warning,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
