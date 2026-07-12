import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, SecondaryButton, SurfaceCard, InfoRow } from '../../components/ui';
import { useAuth, useConnectivity, useDevice } from '../../contexts';
import { clearDisplayCache } from '../../services/cache/liveDataCacheService';
import { getLocalSyncStatus, syncPendingTrips } from '../../services/tracking';
import { colors, spacing, typography } from '../../theme';
import { formatDateTime } from '../../utils/format';

export default function SyncStatusScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isOnline } = useConnectivity();
  const { localDeviceId } = useDevice();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const nextStatus = await getLocalSyncStatus();
      setStatus(nextStatus);
    } catch (loadError) {
      setError(loadError.message ?? 'Không thể kiểm tra đồng bộ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function runSyncNow() {
    if (!user?.uid || !localDeviceId) {
      setError('Chưa có đủ thông tin tài khoản hoặc thiết bị để đồng bộ.');
      return;
    }

    if (!isOnline) {
      setMessage('Bạn đang ngoại tuyến. Hành trình sẽ được đồng bộ khi có kết nối.');
      return;
    }

    setSyncing(true);
    setError('');
    setMessage('');
    try {
      const results = await syncPendingTrips(user.uid, localDeviceId);
      await loadStatus();
      const failedCount = results.filter((result) => !result.ok).length;
      setMessage(
        failedCount > 0
          ? `Đồng bộ hoàn tất một phần. ${failedCount} chuyến thất bại.`
          : 'Đã đồng bộ các chuyến đang chờ.'
      );
    } catch (syncError) {
      setError(syncError.message ?? 'Không thể đồng bộ ngay.');
    } finally {
      setSyncing(false);
    }
  }

  async function clearCache() {
    if (!user?.uid) {
      setError('Chưa có tài khoản để xóa cache.');
      return;
    }

    setError('');
    setMessage('');
    try {
      await clearDisplayCache(user.uid);
      setMessage('Đã xóa cache hiển thị trên thiết bị này.');
    } catch (cacheError) {
      setError(cacheError.message ?? 'Không thể xóa cache.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Đồng bộ</Text>
        <SurfaceCard style={styles.card}>
          <InfoRow
            label="Lần đồng bộ cuối"
            value={status?.lastSyncedAt ? formatDateTime(status.lastSyncedAt) : 'Chưa có dữ liệu'}
          />
          <InfoRow label="Số chuyến chờ đồng bộ" value={String(status?.pendingTripCount ?? 0)} />
          <InfoRow label="Dữ liệu trên thiết bị" value={status?.sqliteStatus ?? 'Đang kiểm tra'} />
          <InfoRow label="Đám mây" value={isOnline ? 'Sẵn sàng' : 'Mất kết nối'} />
          <InfoRow label="Cache" value={status?.cacheStatus ?? 'Đang kiểm tra'} last />
          <View style={styles.buttonGroup}>
            <PrimaryButton
              disabled={loading || syncing}
              label={syncing ? 'Đang đồng bộ' : 'Đồng bộ ngay'}
              loading={syncing}
              onPress={runSyncNow}
            />
            <SecondaryButton
              disabled={loading || syncing}
              label={loading ? 'Đang làm mới...' : 'Làm mới'}
              loading={loading}
              onPress={loadStatus}
            />
            <SecondaryButton label="Xóa cache" onPress={clearCache} />
          </View>
        </SurfaceCard>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  buttonGroup: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    marginTop: spacing.md,
  },
  content: {
    padding: spacing.lg,
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
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
});
