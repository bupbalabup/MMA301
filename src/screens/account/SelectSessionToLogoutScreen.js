import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import PasswordConfirmModal from '../../components/security/PasswordConfirmModal';
import { SurfaceCard } from '../../components/ui';
import { useAuth, useDevice } from '../../contexts';
import {
  logSecurityEvent,
  revokeDeviceSession,
  SECURITY_ACTIONS,
} from '../../services/firebase/accountSecurityService';
import { colors, spacing, typography } from '../../theme';
import {
  formatTimestampValue,
  getDeviceDisplayName,
  getPlatformLabel,
  getSessionStatusLabel,
} from './accountHelpers';

export default function SelectSessionToLogoutScreen() {
  const insets = useSafeAreaInsets();
  const { confirmPassword, logout, user } = useAuth();
  const {
    devices,
    loading,
    localDeviceId,
    localDeviceName,
    refreshDevices,
  } = useDevice();
  const [selectedSession, setSelectedSession] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [message, setMessage] = useState('');

  const visibleDevices = useMemo(() => {
    return devices.filter((device) => {
      return device.status !== 'deleted' && device.sessionStatus !== 'revoked';
    });
  }, [devices]);

  function beginLogout(device) {
    setSelectedSession(device);
    setConfirmError('');
    setMessage('');

    if (device.deviceId === localDeviceId) {
      Alert.alert(
        'Đăng xuất thiết bị hiện tại',
        'Bạn đang chọn phiên hiện tại. Sau khi xác nhận, thiết bị này cũng sẽ đăng xuất.',
        [
          {
            text: 'Hủy',
            style: 'cancel',
            onPress: () => setSelectedSession(null),
          },
          { text: 'Tiếp tục', onPress: () => setConfirmVisible(true) },
        ]
      );
      return;
    }

    setConfirmVisible(true);
  }

  async function performRevoke(device) {
    try {
      await revokeDeviceSession(user.uid, device.deviceId, 'kick_device');
      await logSecurityEvent(user.uid, {
        action: SECURITY_ACTIONS.KICK_DEVICE,
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

      setMessage('Phiên này đã bị đánh dấu đăng xuất trong Track Device.');
      setConfirmVisible(false);
      setSelectedSession(null);
    } catch (error) {
      setConfirmError(error.message ?? 'Không thể đăng xuất phiên đã chọn.');
      setConfirmVisible(true);
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleConfirm(password) {
    if (!user?.uid || !selectedSession?.deviceId) return;

    setConfirmLoading(true);
    setConfirmError('');

    try {
      await confirmPassword(password);
      setConfirmVisible(false);
      const selectedDeviceName = getDeviceDisplayName(selectedSession);
      const warning = selectedSession.deviceId === localDeviceId
        ? 'Bạn đang chọn phiên hiện tại. Phiên này sẽ bị đánh dấu đăng xuất trong Track Device và thiết bị này sẽ đăng xuất.'
        : 'Phiên này sẽ bị đánh dấu đăng xuất trong Track Device.';

      Alert.alert(
        'Xác nhận đăng xuất thiết bị',
        `${selectedDeviceName}\n\n${warning}`,
        [
          {
            text: 'Hủy',
            style: 'cancel',
            onPress: () => {
              setConfirmLoading(false);
              setSelectedSession(null);
            },
          },
          {
            text: 'Đăng xuất thiết bị',
            style: 'destructive',
            onPress: () => performRevoke(selectedSession),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      setConfirmError(error.message ?? 'Không thể xác nhận mật khẩu.');
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
          Chọn đúng phiên cần đăng xuất. Thao tác này là yêu cầu đăng xuất ở cấp ứng dụng.
        </Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}

        {loading && visibleDevices.length === 0 ? (
          <SurfaceCard style={styles.card}>
            <Text style={styles.emptyText}>Đang tải phiên đăng nhập...</Text>
          </SurfaceCard>
        ) : null}

        {!loading && visibleDevices.length === 0 ? (
          <SurfaceCard style={styles.card}>
            <Text style={styles.emptyTitle}>Không có phiên đăng nhập</Text>
            <Text style={styles.emptyText}>Các phiên đăng nhập sẽ xuất hiện tại đây.</Text>
          </SurfaceCard>
        ) : null}

        {visibleDevices.map((device) => {
          const isCurrentDevice = device.deviceId === localDeviceId;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Chọn ${getDeviceDisplayName(device)} để đăng xuất`}
              key={device.deviceId}
              onPress={() => beginLogout(device)}
              style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
            >
              <SurfaceCard>
                <View style={styles.cardHeader}>
                  <Text style={styles.deviceName}>{getDeviceDisplayName(device)}</Text>
                  {isCurrentDevice ? <Text style={styles.currentBadge}>Thiết bị hiện tại</Text> : null}
                </View>
                <Text style={styles.metaText}>{getPlatformLabel(device.platform)}</Text>
                <Text style={styles.metaText}>
                  Hoạt động gần nhất: {formatTimestampValue(device.lastActiveAt ?? device.updatedAt)}
                </Text>
                <Text style={styles.metaText}>Trạng thái: {getSessionStatusLabel(device)}</Text>
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
            setSelectedSession(null);
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
});
