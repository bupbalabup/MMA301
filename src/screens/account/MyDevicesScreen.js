import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ColorPickerModal,
  PrimaryButton,
  SecondaryButton,
  SurfaceCard,
} from '../../components/ui';
import { useAuth, useDevice } from '../../contexts';
import {
  logSecurityEvent,
  SECURITY_ACTIONS,
  updateDevicePreferences,
} from '../../services/firebase/accountSecurityService';
import { colors, radius, spacing, typography } from '../../theme';
import { getSafeMarkerColor, normalizeHexColor } from '../../utils/color';
import {
  getDeviceDisplayName,
  getPlatformLabel,
} from './accountHelpers';

function createDraft(device) {
  return {
    markerColor: getSafeMarkerColor(device.markerColor),
    name: getDeviceDisplayName(device),
  };
}

export default function MyDevicesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    devices,
    localDeviceId,
    localDeviceName,
    refreshDevices,
    selectedDevice,
    setLocalDeviceName,
  } = useDevice();
  const [drafts, setDrafts] = useState({});
  const [savingDeviceId, setSavingDeviceId] = useState(null);
  const [colorPickerDeviceId, setColorPickerDeviceId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const visibleDevices = useMemo(() => {
    return devices.filter((device) => device.status !== 'deleted');
  }, [devices]);

  useEffect(() => {
    const nextDrafts = {};
    visibleDevices.forEach((device) => {
      nextDrafts[device.deviceId] = {
        ...(drafts[device.deviceId] ?? createDraft(device)),
      };
    });
    setDrafts(nextDrafts);
    // Keep local edits while mounted; rebuild only when the Firestore device list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleDevices]);

  function updateDraft(deviceId, data) {
    setDrafts((current) => ({
      ...current,
      [deviceId]: {
        ...(current[deviceId] ?? {}),
        ...data,
      },
    }));
  }

  async function saveDevice(device) {
    const draft = drafts[device.deviceId] ?? createDraft(device);
    const trimmedName = draft.name.trim();
    const normalizedMarkerColor = normalizeHexColor(draft.markerColor);

    if (!trimmedName) {
      setError('Tên thiết bị không được để trống.');
      return;
    }

    if (!normalizedMarkerColor) {
      setError('Mã màu không hợp lệ.');
      return;
    }

    setSavingDeviceId(device.deviceId);
    setError('');
    setMessage('');

    try {
      const previousName = getDeviceDisplayName(device);
      const markerChanged =
        normalizedMarkerColor !== getSafeMarkerColor(device.markerColor);

      await updateDevicePreferences(user.uid, device.deviceId, {
        markerColor: normalizedMarkerColor,
        name: trimmedName,
      });

      if (device.deviceId === localDeviceId && trimmedName !== localDeviceName) {
        await setLocalDeviceName(trimmedName);
      }

      if (trimmedName !== previousName && device.deviceId !== localDeviceId) {
        await logSecurityEvent(user.uid, {
          action: SECURITY_ACTIONS.RENAME_DEVICE,
          deviceId: localDeviceId,
          deviceName: localDeviceName,
          platform: selectedDevice?.platform,
          targetDeviceId: device.deviceId,
          targetDeviceName: trimmedName,
        });
      }

      if (markerChanged) {
        await logSecurityEvent(user.uid, {
          action: SECURITY_ACTIONS.UPDATE_DEVICE_MARKER,
          deviceId: localDeviceId,
          deviceName: localDeviceName,
          platform: selectedDevice?.platform,
          targetDeviceId: device.deviceId,
          targetDeviceName: trimmedName,
        });
      }

      await refreshDevices();
      setMessage('Đã lưu thiết bị.');
    } catch (saveError) {
      setError(saveError.message ?? 'Không thể lưu thiết bị.');
    } finally {
      setSavingDeviceId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Thiết bị của tôi</Text>
        <Text style={styles.description}>
          Đổi tên và màu hiển thị trên bản đồ.
        </Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {visibleDevices.length === 0 ? (
          <SurfaceCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có thiết bị</Text>
            <Text style={styles.emptyText}>
              Thiết bị đăng nhập vào tài khoản sẽ xuất hiện tại đây.
            </Text>
          </SurfaceCard>
        ) : null}

        {visibleDevices.map((device) => {
          const draft = drafts[device.deviceId] ?? createDraft(device);
          const isCurrentDevice = device.deviceId === localDeviceId;
          const safeMarkerColor = getSafeMarkerColor(draft.markerColor);

          return (
            <SurfaceCard key={device.deviceId} style={styles.card}>
              <Text style={styles.deviceTitle}>{getDeviceDisplayName(device)}</Text>
              <Text style={styles.metaText}>
                {getPlatformLabel(device.platform)}
                {isCurrentDevice ? ' - Thiết bị hiện tại' : ''}
              </Text>

              <Text style={styles.cardSectionTitle}>THÔNG TIN CHUNG</Text>
              <Text style={styles.inputLabel}>Tên thiết bị</Text>
              <TextInput
                onChangeText={(name) => updateDraft(device.deviceId, { name })}
                style={styles.input}
                value={draft.name}
              />

              <Text style={styles.cardSectionTitle}>ĐỔI MÀU TRÊN BẢN ĐỒ</Text>
              <Text style={styles.inputLabel}>Đổi màu trên bản đồ</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mở bảng màu cho ${getDeviceDisplayName(device)}`}
                hitSlop={4}
                onPress={() => setColorPickerDeviceId(device.deviceId)}
                style={({ pressed }) => [
                  styles.colorPickerRow,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.colorPreview,
                  { backgroundColor: safeMarkerColor },
                  ]}
                />
                <View style={styles.colorTextWrap}>
                  <Text style={styles.colorLabel}>Màu hiện tại</Text>
                  <Text style={styles.colorValue}>{safeMarkerColor}</Text>
                </View>
                <SecondaryButton
                  label="Đổi màu"
                  onPress={() => setColorPickerDeviceId(device.deviceId)}
                  style={styles.colorButton}
                />
              </Pressable>

              <PrimaryButton
                label={savingDeviceId === device.deviceId ? 'Đang lưu...' : 'Lưu thiết bị'}
                loading={savingDeviceId === device.deviceId}
                onPress={() => saveDevice(device)}
                style={styles.button}
              />

              <ColorPickerModal
                initialColor={safeMarkerColor}
                visible={colorPickerDeviceId === device.deviceId}
                onCancel={() => setColorPickerDeviceId(null)}
                onDone={(nextColor) => {
                  updateDraft(device.deviceId, { markerColor: nextColor });
                  setColorPickerDeviceId(null);
                }}
              />
            </SurfaceCard>
          );
        })}
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
  cardSectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
  colorButton: {
    minWidth: 118,
  },
  colorLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  colorPickerRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    padding: spacing.sm,
  },
  colorPreview: {
    borderColor: colors.borderStrong,
    borderRadius: radius.small,
    borderWidth: 1,
    height: 38,
    width: 50,
  },
  colorTextWrap: {
    flex: 1,
  },
  colorValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '800',
    marginTop: 2,
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
  deviceTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  emptyCard: {
    marginTop: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 21,
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
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
  },
  inputLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  message: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.82,
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
