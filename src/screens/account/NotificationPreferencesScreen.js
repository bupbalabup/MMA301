import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, SurfaceCard } from '../../components/ui';
import { useAuth } from '../../contexts';
import { getUserProfile, updateUserProfile } from '../../services/firebase/userService';
import { colors, spacing, typography } from '../../theme';

const DEFAULT_PREFERENCES = {
  appUpdate: true,
  deviceOffline: true,
  deviceOnline: true,
  deviceMoving: true,
  deviceStopped: true,
  syncComplete: true,
};

const OPTIONS = [
  ['deviceOnline', 'Thiết bị trực tuyến'],
  ['deviceOffline', 'Thiết bị mất kết nối'],
  ['deviceMoving', 'Thiết bị bắt đầu di chuyển'],
  ['deviceStopped', 'Thiết bị dừng'],
  ['syncComplete', 'Đồng bộ hoàn tất'],
  ['appUpdate', 'Có bản cập nhật ứng dụng'],
];

export default function NotificationPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadPreferences() {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const profile = await getUserProfile(user.uid);
        if (mounted) {
          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...(profile?.notificationPreferences ?? {}),
          });
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
  }, [user?.uid]);

  function togglePreference(key) {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
    setMessage('');
  }

  async function savePreferences() {
    if (!user?.uid) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateUserProfile(user.uid, { notificationPreferences: preferences });
      setMessage('Đã lưu tùy chọn thông báo.');
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
        <Text style={styles.title}>Thông báo</Text>
        <Text style={styles.description}>
          Các tùy chọn này không ảnh hưởng thông báo theo dõi cố định của Android.
        </Text>
        <SurfaceCard style={styles.card}>
          {OPTIONS.map(([key, label]) => (
            <Pressable
              accessibilityRole="button"
              key={key}
              onPress={() => togglePreference(key)}
              style={styles.row}
            >
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={[styles.rowValue, preferences[key] ? styles.enabled : styles.disabled]}>
                {preferences[key] ? 'Bật' : 'Tắt'}
              </Text>
            </Pressable>
          ))}
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
  disabled: {
    color: colors.textMuted,
  },
  enabled: {
    color: colors.success,
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
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    paddingRight: spacing.md,
  },
  rowValue: {
    ...typography.button,
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
