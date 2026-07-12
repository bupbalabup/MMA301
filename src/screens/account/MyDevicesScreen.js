import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DangerButton, PrimaryButton, SurfaceCard } from '../../components/ui';
import { useAuth, useDevice } from '../../contexts';
import {
  logSecurityEvent,
  SECURITY_ACTIONS,
  softDeleteDevice,
  updateDevicePreferences,
} from '../../services/firebase/accountSecurityService';
import { colors, radius, spacing, typography } from '../../theme';
import {
  getDeviceDisplayName,
  getPlatformLabel,
  MARKER_COLORS,
  MARKER_ICONS,
} from './accountHelpers';

function createDraft(device) {
  return {
    markerColor: device.markerColor ?? colors.primary,
    markerIcon: device.markerIcon ?? 'device',
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
  const [deletingDeviceId, setDeletingDeviceId] = useState(null);
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
    // Rebuild when the Firestore device list changes; keep local edits while mounted.
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

    if (!trimmedName) {
      setError('Tên thiết bị không được để trống.');
      return;
    }

    setSavingDeviceId(device.deviceId);
    setError('');
    setMessage('');

    try {
      const previousName = getDeviceDisplayName(device);
      const markerChanged =
        draft.markerColor !== (device.markerColor ?? colors.primary) ||
        draft.markerIcon !== (device.markerIcon ?? 'device');

      await updateDevicePreferences(user.uid, device.deviceId, {
        markerColor: draft.markerColor,
        markerIcon: draft.markerIcon,
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

  async function deleteDevice(device) {
    if (device.deviceId === localDeviceId) {
      setError('Không thể xóa thiết bị hiện tại trong màn hình này.');
      return;
    }

    setDeletingDeviceId(device.deviceId);
    setError('');
    setMessage('');

    try {
      await softDeleteDevice(user.uid, device.deviceId);
      await logSecurityEvent(user.uid, {
        action: SECURITY_ACTIONS.DELETE_DEVICE,
        deviceId: localDeviceId,
        deviceName: localDeviceName,
        platform: selectedDevice?.platform,
        targetDeviceId: device.deviceId,
        targetDeviceName: getDeviceDisplayName(device),
      });
      await refreshDevices();
      setMessage('Đã xóa thiết bị khỏi tài khoản.');
    } catch (deleteError) {
      setError(deleteError.message ?? 'Không thể xóa thiết bị.');
    } finally {
      setDeletingDeviceId(null);
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
          Đổi tên, màu và kiểu marker cho từng thiết bị trong tài khoản.
        </Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {visibleDevices.map((device) => {
          const draft = drafts[device.deviceId] ?? createDraft(device);
          const isCurrentDevice = device.deviceId === localDeviceId;

          return (
            <SurfaceCard key={device.deviceId} style={styles.card}>
              <Text style={styles.deviceTitle}>{getDeviceDisplayName(device)}</Text>
              <Text style={styles.metaText}>
                {getPlatformLabel(device.platform)}
                {isCurrentDevice ? ' - Thiết bị hiện tại' : ''}
              </Text>

              <Text style={styles.inputLabel}>Tên thiết bị</Text>
              <TextInput
                onChangeText={(name) => updateDraft(device.deviceId, { name })}
                style={styles.input}
                value={draft.name}
              />

              <Text style={styles.inputLabel}>Màu marker</Text>
              <View style={styles.optionRow}>
                {MARKER_COLORS.map((option) => (
                  <Pressable
                    accessibilityLabel={`Chọn màu ${option.label}`}
                    accessibilityRole="button"
                    key={option.value}
                    onPress={() => updateDraft(device.deviceId, { markerColor: option.value })}
                    style={[
                      styles.colorOption,
                      { backgroundColor: option.value },
                      draft.markerColor === option.value && styles.optionSelected,
                    ]}
                  />
                ))}
              </View>

              <Text style={styles.inputLabel}>Icon marker</Text>
              <View style={styles.optionWrap}>
                {MARKER_ICONS.map((option) => (
                  <Pressable
                    accessibilityRole="button"
                    key={option.value}
                    onPress={() => updateDraft(device.deviceId, { markerIcon: option.value })}
                    style={[
                      styles.textOption,
                      draft.markerIcon === option.value && styles.textOptionSelected,
                    ]}
                  >
                    <Text style={styles.textOptionLabel}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>

              <PrimaryButton
                label={savingDeviceId === device.deviceId ? 'Đang lưu...' : 'Lưu thiết bị'}
                loading={savingDeviceId === device.deviceId}
                onPress={() => saveDevice(device)}
                style={styles.button}
              />
              {!isCurrentDevice ? (
                <DangerButton
                  label={deletingDeviceId === device.deviceId ? 'Đang xóa...' : 'Xóa thiết bị khỏi tài khoản'}
                  loading={deletingDeviceId === device.deviceId}
                  onPress={() => deleteDevice(device)}
                  style={styles.button}
                />
              ) : null}
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
  colorOption: {
    borderRadius: radius.pill,
    height: 30,
    width: 30,
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
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  optionSelected: {
    borderColor: colors.textPrimary,
    borderWidth: 3,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  textOption: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  textOptionLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  textOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
});
