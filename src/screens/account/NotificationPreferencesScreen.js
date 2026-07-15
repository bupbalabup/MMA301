import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, SurfaceCard } from '../../components/ui';
import {
  configureTrackingNotification,
  loadLiveTrackingNotificationPreference,
  saveLiveTrackingNotificationPreference,
} from '../../services/tracking';
import { colors, spacing, typography } from '../../theme';

export default function NotificationPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const [richContentEnabled, setRichContentEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadPreferences() {
      setLoading(true);
      try {
        const enabled = await loadLiveTrackingNotificationPreference();
        if (mounted) {
          setRichContentEnabled(enabled);
        }
      } catch (loadError) {
        if (mounted) setError(loadError.message ?? 'Không thể tải tùy chọn thông báo.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPreferences();
    return () => {
      mounted = false;
    };
  }, []);

  async function savePreferences() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const enabled = await saveLiveTrackingNotificationPreference(
        richContentEnabled
      );
      configureTrackingNotification({ richContentEnabled: enabled });
      setMessage('Đã lưu tùy chọn thông báo trực tiếp.');
    } catch (saveError) {
      setError(saveError.message ?? 'Không thể lưu tùy chọn thông báo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Tùy chọn này chỉ thay đổi lượng thông tin hiển thị. Khi theo dõi đang
          hoạt động, Android vẫn luôn hiển thị thông báo tối thiểu bắt buộc cho
          dịch vụ vị trí nền.
        </Text>
        <SurfaceCard style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>Thông báo trực tiếp</Text>
              <Text style={styles.rowDescription}>
                Hiển thị tốc độ, trạng thái, quãng đường và thời gian chuyến đi.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Thông báo trực tiếp"
              accessibilityRole="switch"
              accessibilityState={{ checked: richContentEnabled }}
              disabled={loading || saving}
              onValueChange={(enabled) => {
                setRichContentEnabled(enabled);
                setMessage('');
                setError('');
              }}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={richContentEnabled ? colors.primary : colors.textMuted}
              value={richContentEnabled}
            />
          </View>
          <PrimaryButton
            disabled={loading || saving}
            label={saving ? 'Đang lưu...' : 'Lưu tùy chọn'}
            loading={saving}
            onPress={savePreferences}
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
  message: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.sm,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  rowCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  rowDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
