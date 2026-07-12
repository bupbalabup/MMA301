import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HISTORY_SOURCE } from '../../constants/history';
import { MainRoutes } from '../../constants/routes';
import { InfoRow, SurfaceCard } from '../../components/ui';
import { useAuth, useDevice } from '../../contexts';
import { getTripDetailBySource } from '../../services/tracking';
import { colors, radius, shadows, spacing, typography } from '../../theme';
import {
  formatCoordinate,
  formatDate,
  formatDateTime,
  formatDistance,
  formatDurationHuman,
  formatLocation,
  formatSpeed,
  formatTripStatus,
} from '../../utils/format';

function MetricTile({ label, value }) {
  return (
    <View style={[styles.metricTile, shadows.card]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export default function TripDetailScreen({ route }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { devices, localDeviceId, localDeviceName } = useDevice();
  const tripId = route?.params?.tripId;
  const source = route?.params?.source ?? HISTORY_SOURCE.LOCAL;
  const deviceId = route?.params?.deviceId ?? localDeviceId;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const deviceName = useMemo(() => {
    const matchedDevice = devices.find((device) => {
      return device.deviceId === deviceId || device.id === deviceId;
    });

    return (
      matchedDevice?.name ??
      matchedDevice?.deviceName ??
      matchedDevice?.platformLabel ??
      (deviceId === localDeviceId ? localDeviceName : null) ??
      'Thiết bị'
    );
  }, [deviceId, devices, localDeviceId, localDeviceName]);

  const isCloudSource = source === HISTORY_SOURCE.CLOUD;

  const loadTripDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextDetail = await getTripDetailBySource({
        source,
        uid: user?.uid,
        deviceId,
        tripId,
      });
      setDetail(nextDetail);
    } catch (tripError) {
      console.warn('Failed to load trip detail.', tripError);
      setError('Không thể tải chi tiết chuyến đi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [deviceId, source, tripId, user?.uid]);

  useFocusEffect(
    useCallback(() => {
      loadTripDetail();
    }, [loadTripDetail])
  );

  function openPlayback() {
    navigation.navigate(MainRoutes.Playback, {
      tripId,
      deviceId,
      source,
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.centerText}>Đang tải chi tiết chuyến đi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Không thể tải chuyến đi</Text>
          <Text style={styles.centerText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={loadTripDetail}
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>Không tìm thấy chuyến đi</Text>
          <Text style={styles.centerText}>
            Chuyến đi này không còn tồn tại trong nguồn dữ liệu đã chọn.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { firstGpsPoint, gpsPointCount, lastGpsPoint, trip } = detail;
  const canOpenPlayback = Boolean(trip?.id);
  const startLocation = formatLocation(
    trip.startAddress,
    trip.startLatitude,
    trip.startLongitude
  );
  const endLocation = formatLocation(
    trip.endAddress,
    trip.endLatitude,
    trip.endLongitude
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, shadows.cardMedium]}>
          <View style={styles.heroTop}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroDate}>{formatDate(trip.date)}</Text>
              <Text style={styles.heroTitle}>Chi tiết chuyến đi</Text>
              <Text style={styles.heroSource}>
                {isCloudSource ? 'Đồng bộ từ đám mây' : 'Lưu trên thiết bị này'}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{formatTripStatus(trip.status)}</Text>
            </View>
          </View>
          <Text style={styles.heroDistance}>
            {formatDistance(trip.totalDistanceKm)}
          </Text>
          <Text style={styles.heroDistanceLabel}>Tổng quãng đường</Text>
        </View>

        <Text style={styles.sectionLabel}>THIẾT BỊ</Text>
        <SurfaceCard>
          <InfoRow label="Tên thiết bị" value={deviceName} />
          <InfoRow
            label="Nguồn dữ liệu"
            value={isCloudSource ? 'Đồng bộ từ đám mây' : 'Lưu trên thiết bị này'}
            last
          />
        </SurfaceCard>

        <Text style={styles.sectionLabel}>THÔNG SỐ CHUYẾN ĐI</Text>
        <View style={styles.metricsGrid}>
          <MetricTile
            label="Thời lượng"
            value={formatDurationHuman(trip.durationMs)}
          />
          <MetricTile
            label="Tốc độ TB"
            value={formatSpeed(trip.avgSpeedKmh)}
          />
          <MetricTile
            label="Tốc độ max"
            value={formatSpeed(trip.maxSpeedKmh, { emptyForInvalid: true })}
          />
          <MetricTile label="Số điểm GPS" value={`${gpsPointCount ?? 0}`} />
        </View>

        <Text style={styles.sectionLabel}>THỜI GIAN</Text>
        <SurfaceCard>
          <InfoRow label="Bắt đầu" value={formatDateTime(trip.startTime)} />
          <InfoRow label="Kết thúc" value={formatDateTime(trip.endTime)} />
          <InfoRow
            label="Thời lượng"
            value={formatDurationHuman(trip.durationMs)}
            last
          />
        </SurfaceCard>

        <Text style={styles.sectionLabel}>LỘ TRÌNH</Text>
        <SurfaceCard>
          <View style={styles.routeRow}>
            <View style={styles.routeDots}>
              <View style={[styles.routeDot, styles.routeDotStart]} />
              <View style={styles.routeConnector} />
              <View style={[styles.routeDot, styles.routeDotEnd]} />
            </View>
            <View style={styles.routeLabels}>
              <View style={styles.routePoint}>
                <Text style={styles.routePointLabel}>Điểm xuất phát</Text>
                <Text style={styles.routePointValue} numberOfLines={3}>
                  {startLocation}
                </Text>
              </View>
              <View style={styles.routePoint}>
                <Text style={styles.routePointLabel}>Điểm kết thúc</Text>
                <Text style={styles.routePointValue} numberOfLines={3}>
                  {endLocation}
                </Text>
              </View>
            </View>
          </View>
        </SurfaceCard>

        <Text style={styles.sectionLabel}>DỮ LIỆU GPS</Text>
        {gpsPointCount > 0 ? (
          <SurfaceCard>
            <InfoRow
              label="Tọa độ đầu"
              value={formatCoordinate(
                firstGpsPoint?.latitude,
                firstGpsPoint?.longitude
              )}
            />
            <InfoRow
              label="Tọa độ cuối"
              value={formatCoordinate(
                lastGpsPoint?.latitude,
                lastGpsPoint?.longitude
              )}
            />
            <InfoRow
              label="Thời điểm đầu"
              value={formatDateTime(firstGpsPoint?.timestamp)}
            />
            <InfoRow
              label="Thời điểm cuối"
              value={formatDateTime(lastGpsPoint?.timestamp)}
              last
            />
          </SurfaceCard>
        ) : (
          <SurfaceCard>
            <Text style={styles.noGpsText}>
              Chuyến đi này chưa có điểm GPS để xem trước.
            </Text>
          </SurfaceCard>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.playbackButton,
            !canOpenPlayback && styles.playbackButtonDisabled,
            pressed && styles.playbackButtonPressed,
          ]}
          onPress={openPlayback}
          disabled={!canOpenPlayback}
          accessibilityRole="button"
        >
          <Text style={styles.playbackButtonText}>
            {canOpenPlayback
              ? 'Xem bản đồ hành trình'
              : 'Chưa có dữ liệu bản đồ'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  centerText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  errorTitle: {
    ...typography.sectionTitle,
    color: colors.danger,
    textAlign: 'center',
  },
  heroCard: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.large,
    padding: spacing.xl,
  },
  heroDate: {
    ...typography.label,
    color: colors.textMuted,
  },
  heroDistance: {
    color: colors.surface,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: spacing.md,
  },
  heroDistanceLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  heroSource: {
    ...typography.caption,
    color: colors.borderStrong,
    marginTop: 2,
  },
  heroTextBlock: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  heroTitle: {
    ...typography.sectionTitle,
    color: colors.surface,
    marginTop: 2,
  },
  heroTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metricLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  metricTile: {
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.md,
  },
  metricValue: {
    ...typography.metricMedium,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  noGpsText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  playbackButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    marginTop: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  playbackButtonPressed: {
    opacity: 0.85,
  },
  playbackButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  playbackButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 3,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  routeConnector: {
    backgroundColor: colors.border,
    flex: 1,
    marginVertical: 3,
    width: 2,
  },
  routeDot: {
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
  routeDotEnd: {
    backgroundColor: colors.offline,
  },
  routeDotStart: {
    backgroundColor: colors.moving,
  },
  routeDots: {
    alignItems: 'center',
    marginRight: spacing.md,
    paddingTop: 3,
    width: 10,
  },
  routeLabels: {
    flex: 1,
    gap: spacing.lg,
  },
  routePoint: {},
  routePointLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  routePointValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 2,
  },
  routeRow: {
    flexDirection: 'row',
    minHeight: 80,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  statusBadge: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  statusText: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 10,
  },
});
