import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecondaryButton, SurfaceCard, InfoRow } from '../../components/ui';
import { useAuth } from '../../contexts';
import { listSecurityLogs } from '../../services/firebase/accountSecurityService';
import { colors, spacing, typography } from '../../theme';
import { formatTimestampValue, getPlatformLabel, getSecurityActionLabel } from './accountHelpers';

export default function SecurityLogScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadLogs = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError('');
    try {
      setLogs(await listSecurityLogs(user.uid));
    } catch (loadError) {
      setError(loadError.message ?? 'Không thể tải nhật ký hoạt động.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <SecondaryButton
          label={loading ? 'Đang tải...' : 'Làm mới'}
          loading={loading}
          onPress={loadLogs}
          style={styles.refreshButton}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && logs.length === 0 ? (
          <SurfaceCard style={styles.card}>
            <Text style={styles.emptyText}>Chưa có nhật ký hoạt động.</Text>
          </SurfaceCard>
        ) : null}
        {logs.map((log) => (
          <SurfaceCard key={log.id} style={styles.card}>
            <InfoRow label="Thời gian" value={formatTimestampValue(log.createdAt)} />
            <InfoRow label="Thiết bị" value={log.targetDeviceName ?? log.deviceName ?? 'Thiết bị'} />
            <InfoRow label="Nền tảng" value={getPlatformLabel(log.platform)} />
            <InfoRow label="Hành động" value={getSecurityActionLabel(log.action)} last />
          </SurfaceCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  content: {
    padding: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  refreshButton: {
    marginTop: spacing.md,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
