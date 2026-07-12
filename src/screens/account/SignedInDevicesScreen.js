import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import PasswordConfirmModal from '../../components/security/PasswordConfirmModal';
import {
  DangerButton,
  InfoRow,
  SurfaceCard,
} from '../../components/ui';
import { useAuth, useDevice } from '../../contexts';
import {
  logSecurityEvent,
  revokeAllDeviceSessions,
  revokeDeviceSession,
  SECURITY_ACTIONS,
} from '../../services/firebase/accountSecurityService';
import { colors, spacing, typography } from '../../theme';
import {
  formatTimestampValue,
  getAppVersionLabel,
  getDeviceDisplayName,
  getPlatformLabel,
  getSessionStatusLabel,
} from './accountHelpers';

export default function SignedInDevicesScreen() {
  const insets = useSafeAreaInsets();
  const { confirmPassword, logout, user } = useAuth();
  const {
    devices,
    localDeviceId,
    localDeviceName,
    refreshDevices,
    selectedDevice,
  } = useDevice();
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmMode, setConfirmMode] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [message, setMessage] = useState('');

  const visibleDevices = useMemo(() => {
    return devices.filter((device) => device.status !== 'deleted');
  }, [devices]);

  async function handleConfirm(password) {
    if (!user?.uid) return;

    setConfirmLoading(true);
    setConfirmError('');
    setMessage('');

    try {
      await confirmPassword(password);

      if (confirmMode === 'all') {
        await revokeAllDeviceSessions(user.uid, 'logout_all');
        await logSecurityEvent(user.uid, {
          action: SECURITY_ACTIONS.LOGOUT_ALL,
          deviceId: localDeviceId,
          deviceName: localDeviceName,
          platform: selectedDevice?.platform,
        });
        await logout();
        return;
      }

      if (confirmMode === 'device' && confirmTarget?.deviceId) {
        await revokeDeviceSession(user.uid, confirmTarget.deviceId, 'kick_device');
        await logSecurityEvent(user.uid, {
          action: SECURITY_ACTIONS.KICK_DEVICE,
          deviceId: localDeviceId,
          deviceName: localDeviceName,
          platform: selectedDevice?.platform,
          targetDeviceId: confirmTarget.deviceId,
          targetDeviceName: getDeviceDisplayName(confirmTarget),
        });
        await refreshDevices();
        setMessage('Đã gửi yêu cầu đăng xuất thiết bị.');
      }

      setConfirmTarget(null);
      setConfirmMode(null);
    } catch (error) {
      setConfirmError(error.message ?? 'Không thể xác nhận mật khẩu.');
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Thiết bị đang đăng nhập</Text>
        <Text style={styles.description}>
          Danh sách phiên đăng nhập được quản lý bằng trạng thái thiết bị trong tài khoản.
        </Text>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {visibleDevices.map((device) => {
          const isCurrentDevice = device.deviceId === localDeviceId;

          return (
            <SurfaceCard key={device.deviceId} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.deviceName}>{getDeviceDisplayName(device)}</Text>
                {isCurrentDevice ? <Text style={styles.currentBadge}>Thiết bị hiện tại</Text> : null}
              </View>
              <InfoRow label="Nền tảng" value={getPlatformLabel(device.platform)} />
              <InfoRow label="Phiên bản app" value={getAppVersionLabel(device)} />
              <InfoRow label="Thời gian đăng nhập" value={formatTimestampValue(device.sessionStartedAt)} />
              <InfoRow label="Hoạt động gần nhất" value={formatTimestampValue(device.lastActiveAt ?? device.updatedAt)} />
              <InfoRow label="Trạng thái" value={getSessionStatusLabel(device)} last />
              {!isCurrentDevice ? (
                <DangerButton
                  label="Đăng xuất thiết bị này"
                  onPress={() => {
                    setConfirmTarget(device);
                    setConfirmMode('device');
                    setConfirmError('');
                  }}
                  style={styles.button}
                />
              ) : null}
            </SurfaceCard>
          );
        })}

        <SurfaceCard style={styles.card}>
          <Text style={styles.sectionTitle}>Đăng xuất tất cả thiết bị</Text>
          <Text style={styles.description}>
            Thiết bị hiện tại cũng sẽ đăng xuất sau khi xác nhận mật khẩu.
          </Text>
          <DangerButton
            label="Đăng xuất tất cả thiết bị"
            onPress={() => {
              setConfirmMode('all');
              setConfirmTarget(null);
              setConfirmError('');
            }}
            style={styles.button}
          />
        </SurfaceCard>
      </ScrollView>

      <PasswordConfirmModal
        error={confirmError}
        loading={confirmLoading}
        onCancel={() => {
          if (!confirmLoading) {
            setConfirmMode(null);
            setConfirmTarget(null);
            setConfirmError('');
          }
        }}
        onConfirm={handleConfirm}
        title="Nhập mật khẩu để xác nhận."
        visible={Boolean(confirmMode)}
      />
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
  cardHeader: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
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
  message: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.md,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
});
