import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  InfoRow,
  SurfaceCard,
} from '../../components/ui';
import { useDevice } from '../../contexts';
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
  const { devices, localDeviceId } = useDevice();

  const visibleDevices = useMemo(() => {
    return devices.filter((device) => device.status !== 'deleted');
  }, [devices]);

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Thiết bị đang đăng nhập</Text>
        <Text style={styles.description}>
          Danh sách phiên đăng nhập hiện được quản lý ở cấp ứng dụng.
        </Text>

        {visibleDevices.length === 0 ? (
          <SurfaceCard style={styles.card}>
            <Text style={styles.emptyTitle}>Không có phiên đăng nhập</Text>
            <Text style={styles.emptyText}>Thiết bị đăng nhập sẽ xuất hiện tại đây.</Text>
          </SurfaceCard>
        ) : null}

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
            </SurfaceCard>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
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
