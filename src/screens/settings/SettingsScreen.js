import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { isRunningInExpoGo } from 'expo';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrackIcon } from '../../components/icons';
import {
  DangerButton,
  InfoRow,
  PrimaryButton,
  SecondaryButton,
  SurfaceCard,
  StatusBadge,
} from '../../components/ui';
import { MainRoutes } from '../../constants/routes';
import { useAuth, useDevice, usePermissionSetup, useTracking } from '../../contexts';
import {
  confirmAutoStartEnabledByUser,
  openAutoStartSettings,
  openBatteryOptimizationSettings,
  requestNotificationPermission,
} from '../../services/device/deviceSetupService';
import {
  logSecurityEvent,
  SECURITY_ACTIONS,
} from '../../services/firebase/accountSecurityService';
import {
  requestBackgroundPermission,
  requestForegroundPermission,
} from '../../services/location/locationPermissionService';
import { colors, radius, spacing, typography } from '../../theme';
import {
  formatCoordinate,
  formatSpeed,
  formatStatus,
} from '../../utils/format';
import {
  getStatusTone,
  normalizeAutoStartStatus,
  normalizeBatteryOptimizationStatus,
  normalizeLocationPermission,
  normalizeLocationServices,
  normalizeNotificationPermission,
} from '../../utils/permissionStatus';

const IS_ANDROID = Platform.OS === 'android';
const IS_IOS = Platform.OS === 'ios';
const IS_EXPO_GO = isRunningInExpoGo();

function Section({ children, icon, title }) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeading}>
        <TrackIcon name={icon} size={22} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <SurfaceCard style={styles.sectionCard}>{children}</SurfaceCard>
    </View>
  );
}

function StatusRow({ label, status }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusRowLabel}>{label}</Text>
      <StatusBadge
        label={status.label}
        status={getStatusTone(status)}
        size="sm"
      />
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();
  const {
    activeTripMaxSpeedKmh,
    connectionStatus,
    currentSpeedKmh,
    disableTracking,
    enableTracking,
    isTrackingEnabled,
    movementStatus,
    trackingState,
  } = useTracking();
  const {
    localDeviceId,
    localDeviceName,
    loading: deviceLoading,
    selectedDevice,
    setLocalDeviceName,
  } = useDevice();
  const {
    refreshError,
    refreshing: setupRefreshing,
    refreshSetupStatus,
    setupStatus,
  } = usePermissionSetup();

  const mountedRef = useRef(true);
  const [deviceNameInput, setDeviceNameInput] = useState(localDeviceName ?? '');
  const [deviceNameMessage, setDeviceNameMessage] = useState('');
  const [deviceNameError, setDeviceNameError] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [permissionActionLoading, setPermissionActionLoading] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [savingDeviceName, setSavingDeviceName] = useState(false);
  const [trackingActionLoading, setTrackingActionLoading] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setDeviceNameInput(localDeviceName ?? '');
  }, [localDeviceName]);

  const loadSetupStatus = useCallback(async () => {
    setPermissionError('');
    setPermissionActionLoading(true);
    try {
      await refreshSetupStatus();
    } catch (error) {
      if (mountedRef.current) {
        setPermissionError(error.message ?? 'Không thể kiểm tra trạng thái thiết lập.');
      }
    } finally {
      if (mountedRef.current) {
        setPermissionActionLoading(false);
      }
    }
  }, [refreshSetupStatus]);

  useFocusEffect(
    useCallback(() => {
      loadSetupStatus();
    }, [loadSetupStatus])
  );

  const foregroundStatus = normalizeLocationPermission(
    setupStatus?.foregroundPermission,
    { checking: setupRefreshing && !setupStatus }
  );
  const backgroundStatus = normalizeLocationPermission(
    setupStatus?.backgroundPermission,
    { checking: setupRefreshing && !setupStatus, unsupported: IS_IOS && IS_EXPO_GO }
  );
  const servicesStatus = normalizeLocationServices(setupStatus?.servicesEnabled, {
    checking: setupRefreshing && !setupStatus,
  });
  const notificationStatus = normalizeNotificationPermission(
    setupStatus?.notificationPermission,
    { checking: setupRefreshing && !setupStatus }
  );
  const autoStartStatus = normalizeAutoStartStatus(setupStatus?.autoStart);
  const batteryStatus = normalizeBatteryOptimizationStatus(
    setupStatus?.batteryOptimization ?? { checking: setupRefreshing && !setupStatus }
  );

  const trimmedDeviceNameInput = deviceNameInput.trim();
  const isDeviceNameUnchanged =
    trimmedDeviceNameInput === (localDeviceName ?? '').trim();
  const canSaveDeviceName =
    Boolean(trimmedDeviceNameInput) && !isDeviceNameUnchanged && !savingDeviceName;
  const setupActionLoading = permissionActionLoading || setupRefreshing;
  const syncStateLabel = connectionStatus === 'Offline' ? 'Chờ kết nối' : 'Sẵn sàng';

  async function runSetupAction(action) {
    setPermissionError('');
    setPermissionActionLoading(true);
    try {
      await action();
      await refreshSetupStatus();
    } catch (error) {
      if (mountedRef.current) {
        setPermissionError(error.message ?? 'Không thể thực hiện thao tác.');
      }
    } finally {
      if (mountedRef.current) {
        setPermissionActionLoading(false);
      }
    }
  }

  async function toggleTracking() {
    setTrackingActionLoading(true);
    try {
      if (isTrackingEnabled) {
        await disableTracking();
      } else {
        await enableTracking();
      }
    } finally {
      setTrackingActionLoading(false);
    }
  }

  async function saveDeviceName() {
    const trimmedName = deviceNameInput.trim();
    if (!trimmedName) {
      setDeviceNameMessage('Tên thiết bị không được để trống.');
      setDeviceNameError(true);
      return;
    }

    setSavingDeviceName(true);
    setDeviceNameMessage('');
    setDeviceNameError(false);

    try {
      await setLocalDeviceName(trimmedName);
      setDeviceNameMessage('Đã lưu tên thiết bị.');
    } catch (error) {
      setDeviceNameMessage(`Không thể lưu. ${error.message}`);
      setDeviceNameError(true);
    } finally {
      setSavingDeviceName(false);
    }
  }

  async function handleLogout() {
    try {
      if (user?.uid) {
        await logSecurityEvent(user.uid, {
          action: SECURITY_ACTIONS.LOGOUT,
          deviceId: localDeviceId,
          deviceName: localDeviceName,
          platform: selectedDevice?.platform,
        });
      }
    } catch (error) {
      console.warn('Failed to log logout event.', error);
    }

    await logout();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.md },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Section icon="device" title="Thiết bị">
          <Text style={styles.explanationText}>
            Chỉ thiết bị đang chạy ứng dụng này có thể ghi GPS. Thiết bị khác chỉ được theo dõi từ xa.
          </Text>
          <InfoRow
            label="Tên hiện tại"
            value={deviceLoading ? 'Đang tải...' : (localDeviceName || 'Chưa đặt tên')}
          />
          <InfoRow label="Mã thiết bị" value={localDeviceId ?? 'Chưa có thiết bị'} last />

          <Text style={styles.inputLabel}>Đặt tên thiết bị</Text>
          <TextInput
            autoCapitalize="sentences"
            onBlur={() => setInputFocused(false)}
            onChangeText={(text) => {
              setDeviceNameInput(text);
              setDeviceNameMessage('');
              setDeviceNameError(false);
            }}
            onFocus={() => setInputFocused(true)}
            placeholder="Nhập tên thiết bị"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, inputFocused && styles.inputFocused]}
            value={deviceNameInput}
          />
          {deviceNameMessage ? (
            <Text style={[styles.messageText, deviceNameError && styles.messageError]}>
              {deviceNameMessage}
            </Text>
          ) : null}
          <PrimaryButton
            disabled={!canSaveDeviceName}
            label="Lưu tên thiết bị"
            loading={savingDeviceName}
            loadingLabel="Đang lưu..."
            onPress={saveDeviceName}
            style={styles.fieldButton}
          />
        </Section>

        <Section icon="movement" title="Theo dõi và quyền">
          <InfoRow label="Trạng thái" value={isTrackingEnabled ? 'Đang bật' : 'Đang tắt'} last />
          {isTrackingEnabled ? (
            <DangerButton
              label={trackingActionLoading ? 'Đang cập nhật...' : 'Tắt theo dõi'}
              loading={trackingActionLoading}
              onPress={toggleTracking}
              style={styles.fieldButton}
            />
          ) : (
            <PrimaryButton
              label={trackingActionLoading ? 'Đang cập nhật...' : 'Bật theo dõi'}
              loading={trackingActionLoading}
              onPress={toggleTracking}
              style={styles.fieldButton}
            />
          )}
        </Section>

        <Section icon="dashboard" title="Trạng thái theo dõi">
          <InfoRow label="Chuyển động" value={formatStatus(movementStatus)} />
          <InfoRow label="Kết nối" value={formatStatus(connectionStatus)} />
          <InfoRow label="Tốc độ hiện tại" value={formatSpeed(currentSpeedKmh)} />
          <InfoRow label="Tốc độ max chuyến" value={formatSpeed(activeTripMaxSpeedKmh)} />
          <InfoRow
            label="Tọa độ cuối"
            value={formatCoordinate(trackingState.lastLatitude, trackingState.lastLongitude)}
          />
          <InfoRow label="Đồng bộ đám mây" value={syncStateLabel} />
          <InfoRow label="Email tài khoản" value={user?.email ?? 'Không xác định'} last />
        </Section>

        <Section icon="permission" title="Quyền và thiết lập hệ thống">
          <Text style={styles.groupLabel}>Bắt buộc</Text>
          <StatusRow label="Vị trí khi dùng ứng dụng" status={foregroundStatus} />
          <StatusRow label="Dịch vụ vị trí" status={servicesStatus} />
          <StatusRow label={IS_IOS ? 'Vị trí luôn luôn' : 'Vị trí luôn cho phép'} status={backgroundStatus} />
          {IS_ANDROID ? <StatusRow label="Thông báo" status={notificationStatus} /> : null}

          {IS_ANDROID ? (
            <>
              <Text style={styles.groupLabel}>Khuyến nghị</Text>
              <StatusRow label="Tự khởi động" status={autoStartStatus} />
              <StatusRow label="Tắt tối ưu pin" status={batteryStatus} />
            </>
          ) : null}

          {IS_IOS && IS_EXPO_GO ? (
            <Text style={styles.warningText}>
              Expo Go không hỗ trợ theo dõi vị trí nền trên iOS. Hãy dùng Development Build hoặc bản cài đặt chính thức để kiểm thử.
            </Text>
          ) : null}
          {IS_ANDROID && IS_EXPO_GO ? (
            <Text style={styles.warningText}>
              Thông báo theo dõi cố định cần Android Development Build hoặc APK; Expo Go không hỗ trợ kiểm thử đầy đủ.
            </Text>
          ) : null}
          {permissionError || refreshError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{permissionError || refreshError}</Text>
            </View>
          ) : null}

          <View style={styles.buttonGroup}>
            <SecondaryButton
              label={setupActionLoading ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
              loading={setupActionLoading}
              onPress={loadSetupStatus}
            />
            {!setupStatus?.foregroundPermission?.granted ? (
              <SecondaryButton
                label={setupStatus?.foregroundPermission?.canAskAgain === false ? 'Mở Cài đặt vị trí' : 'Cho phép vị trí'}
                loading={setupActionLoading}
                onPress={() => runSetupAction(
                  setupStatus?.foregroundPermission?.canAskAgain === false
                    ? Linking.openSettings
                    : requestForegroundPermission
                )}
              />
            ) : null}
            {!backgroundStatus.verified && !(IS_IOS && IS_EXPO_GO) ? (
              <SecondaryButton
                label={setupStatus?.backgroundPermission?.canAskAgain === false ? 'Mở Cài đặt vị trí' : 'Cho phép luôn luôn'}
                loading={setupActionLoading}
                onPress={() => runSetupAction(
                  setupStatus?.backgroundPermission?.canAskAgain === false
                    ? Linking.openSettings
                    : requestBackgroundPermission
                )}
              />
            ) : null}
            {IS_ANDROID && notificationStatus.key !== 'not_required' && !notificationStatus.verified ? (
              <SecondaryButton
                label={notificationStatus.key === 'blocked' ? 'Mở Cài đặt thông báo' : 'Cho phép thông báo'}
                loading={setupActionLoading}
                onPress={() => runSetupAction(
                  notificationStatus.key === 'blocked'
                    ? Linking.openSettings
                    : requestNotificationPermission
                )}
              />
            ) : null}
            {IS_ANDROID ? (
              <>
                <SecondaryButton label="Mở cài đặt tự khởi động" loading={setupActionLoading} onPress={() => runSetupAction(openAutoStartSettings)} />
                <SecondaryButton label="Tôi đã bật tự khởi động" loading={setupActionLoading} onPress={() => runSetupAction(confirmAutoStartEnabledByUser)} />
                <SecondaryButton label="Mở cài đặt tối ưu pin" loading={setupActionLoading} onPress={() => runSetupAction(openBatteryOptimizationSettings)} />
              </>
            ) : null}
            <SecondaryButton
              label="Mở thiết lập theo dõi"
              onPress={() => navigation.navigate(MainRoutes.PermissionSetup)}
            />
          </View>
        </Section>

        <Section icon="settings" title="Tài khoản và bảo mật">
          <View style={styles.buttonGroup}>
            <SecondaryButton
              label="Hồ sơ tài khoản"
              onPress={() => navigation.navigate(MainRoutes.Account)}
            />
            <SecondaryButton
              label="Thiết bị đang đăng nhập"
              onPress={() => navigation.navigate(MainRoutes.SignedInDevices)}
            />
            <SecondaryButton
              label="Thiết bị của tôi"
              onPress={() => navigation.navigate(MainRoutes.MyDevices)}
            />
            <SecondaryButton
              label="Thông báo"
              onPress={() => navigation.navigate(MainRoutes.NotificationPreferences)}
            />
            <SecondaryButton
              label="Đồng bộ"
              onPress={() => navigation.navigate(MainRoutes.SyncStatus)}
            />
            <SecondaryButton
              label="Nhật ký hoạt động"
              onPress={() => navigation.navigate(MainRoutes.SecurityLog)}
            />
          </View>
        </Section>

        <Section icon="settings" title="Tài khoản">
          <InfoRow label="Email" value={user?.email ?? 'Không xác định'} last />
          <DangerButton label="Đăng xuất" onPress={handleLogout} style={styles.fieldButton} />
        </Section>

        <Section icon="location" title="Về ứng dụng">
          <InfoRow label="Tên" value="Track Device" />
          <InfoRow label="Phiên bản" value="MVP 1" />
          <InfoRow label="Chức năng" value="Theo dõi GPS tự động" last />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  buttonGroup: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  content: {
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
  explanationText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  fieldButton: {
    marginTop: spacing.md,
  },
  groupLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
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
  inputFocused: {
    borderColor: colors.primary,
  },
  inputLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  messageError: {
    color: colors.danger,
  },
  messageText: {
    ...typography.caption,
    color: colors.moving,
    marginTop: spacing.xs,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  sectionBlock: {
    marginTop: spacing.lg,
  },
  sectionCard: {
    marginTop: 0,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 34,
    paddingVertical: spacing.xs,
  },
  statusRowLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  warningText: {
    ...typography.caption,
    color: colors.warning,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
