import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useConnectivity,
  useDevice,
  useLiveDevice,
  useTracking,
} from '../../contexts';
import { colors, radius, shadows, spacing, typography } from '../../theme';
import {
  formatCoordinate,
  formatLostConnectionDuration,
  formatLastUpdate,
  formatSpeed,
  formatStoppedDuration,
  formatStatus,
  getDeviceName,
} from '../../utils/format';
import { InfoRow, StatusBadge, SurfaceCard } from '../../components/ui';

// --- Hero speed card ------------------------------------------------------------

function SpeedHero({ isLocal, lastUpdateMs, maxSpeedKmh, speedKmh }) {
  return (
    <View style={[styles.speedHero, shadows.cardMedium]}>
      <Text style={styles.speedLabel}>
        {isLocal ? 'Tốc độ hiện tại' : 'Tốc độ gần nhất'}
      </Text>
      <Text style={styles.speedValue} numberOfLines={1} adjustsFontSizeToFit>
        {formatSpeed(speedKmh, { emptyForInvalid: !isLocal })}
      </Text>
      {isLocal ? (
        <Text style={styles.speedSub}>
          Tốc độ tối đa của chuyến: {formatSpeed(maxSpeedKmh)}
        </Text>
      ) : (
        <Text style={styles.speedSub}>
          Cập nhật: {formatLastUpdate(lastUpdateMs)}
        </Text>
      )}
    </View>
  );
}

// --- Main screen ----------------------------------------------------------------

export default function LiveTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { isOnline } = useConnectivity();
  const {
    localDeviceId,
    localDeviceName,
    selectedDevice,
    selectedDeviceId,
  } = useDevice();
  const {
    activeTripMaxSpeedKmh,
    connectionStatus,
    currentSpeedKmh,
    isTrackingEnabled,
    movementStatus,
    stoppedDurationMs,
    todayDistanceKm,
    trackingState,
  } = useTracking();
  const {
    isDeviceOnline,
    isViewingLocalDevice,
    lastUpdateMs,
    liveLocation,
    selectedFleetDevice,
  } = useLiveDevice();

  const selectedDeviceName =
    getDeviceName(selectedDevice) ||
    (selectedDeviceId === localDeviceId ? localDeviceName : null) ||
    'Chưa có thiết bị';

  const displayMovementStatus = isViewingLocalDevice
    ? (trackingState.lastGpsAt ? movementStatus : liveLocation?.movementStatus ?? movementStatus)
    : (liveLocation?.movementStatus ?? liveLocation?.status ?? null);

  const displayConnectionStatus = isOnline === false
    ? 'Offline'
    : isViewingLocalDevice
      ? connectionStatus
      : isDeviceOnline ? 'Online' : 'Offline';

  const displaySpeedKmh = isViewingLocalDevice
    ? (trackingState.lastGpsAt ? currentSpeedKmh : liveLocation?.speedKmh)
    : liveLocation?.speedKmh;

  const displayStoppedDurationMs = isViewingLocalDevice
    ? (trackingState.lastGpsAt ? stoppedDurationMs : liveLocation?.stoppedDurationMs)
    : liveLocation?.stoppedDurationMs;

  const displayLatitude = isViewingLocalDevice
    ? (trackingState.lastLatitude ?? liveLocation?.latitude)
    : liveLocation?.latitude;

  const displayLongitude = isViewingLocalDevice
    ? (trackingState.lastLongitude ?? liveLocation?.longitude)
    : liveLocation?.longitude;
  const displayMaxSpeedKmh = isViewingLocalDevice
    ? (trackingState.lastGpsAt ? activeTripMaxSpeedKmh : liveLocation?.activeTripMaxSpeedKmh)
    : liveLocation?.activeTripMaxSpeedKmh;
  const displayTodayDistanceKm = isViewingLocalDevice
    ? (trackingState.lastGpsAt ? todayDistanceKm : liveLocation?.todayDistanceKm)
    : liveLocation?.todayDistanceKm;
  const displayLastUpdateMs = isViewingLocalDevice
    ? (trackingState.lastGpsAt ?? lastUpdateMs)
    : lastUpdateMs;
  const displayAddress = liveLocation?.address ?? null;
  const lostConnectionDurationMs =
    displayConnectionStatus === 'Offline'
      ? selectedFleetDevice?.lostConnectionDurationMs
      : null;

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
        {/* -- Device header -- */}
        <View style={styles.deviceHeader}>
          <View style={styles.deviceHeaderLeft}>
            <Text style={styles.deviceName} numberOfLines={1}>
              {selectedDeviceName}
            </Text>
            <View
              style={[
                styles.deviceTypeBadge,
                isViewingLocalDevice
                  ? styles.deviceTypeBadgeLocal
                  : styles.deviceTypeBadgeRemote,
              ]}
            >
              <Text
                style={[
                  styles.deviceTypeBadgeText,
                  isViewingLocalDevice
                    ? styles.deviceTypeBadgeTextLocal
                    : styles.deviceTypeBadgeTextRemote,
                ]}
              >
                {isViewingLocalDevice ? 'Thiết bị này' : 'Từ xa'}
              </Text>
            </View>
          </View>
          <StatusBadge
            status={displayConnectionStatus}
            label={formatStatus(displayConnectionStatus)}
            size="sm"
          />
        </View>

        {/* -- Speed hero -- */}
        <SpeedHero
          speedKmh={displaySpeedKmh}
          maxSpeedKmh={displayMaxSpeedKmh}
          isLocal={isViewingLocalDevice}
          lastUpdateMs={displayLastUpdateMs}
        />

        {/* -- Stopped duration card -- */}
        <SurfaceCard style={styles.stopCard}>
          <Text style={styles.stopLabel}>Thời gian dừng</Text>
          <Text style={styles.stopValue}>
            {Number.isFinite(displayStoppedDurationMs)
              ? formatStoppedDuration(displayStoppedDurationMs)
              : 'Chưa có dữ liệu'}
          </Text>
        </SurfaceCard>

        {/* -- Status section -- */}
        <Text style={styles.sectionLabel}>TRẠNG THÁI</Text>
        <SurfaceCard>
          <View style={styles.statusBadgeRow}>
            <StatusBadge
              status={displayMovementStatus}
              label={formatStatus(displayMovementStatus)}
            />
          </View>
          <InfoRow
            label="Kết nối"
            value={formatStatus(displayConnectionStatus)}
          />
          {displayConnectionStatus === 'Offline' ? (
            <InfoRow
              label="Mất kết nối"
              value={formatLostConnectionDuration(lostConnectionDurationMs)}
            />
          ) : null}
          <InfoRow
            label="Quãng đường hôm nay"
            value={Number.isFinite(displayTodayDistanceKm)
              ? `${displayTodayDistanceKm.toFixed(2)} km`
              : 'Chưa có dữ liệu'}
          />
          {isViewingLocalDevice ? (
            <InfoRow
              label="Theo dõi tự động"
              value={isTrackingEnabled ? 'Đang bật' : 'Đang tắt'}
              last
            />
          ) : null}
        </SurfaceCard>

        {/* -- GPS data section -- */}
        <Text style={styles.sectionLabel}>DỮ LIỆU GPS</Text>
        <SurfaceCard>
          <InfoRow
            label="Tọa độ"
            value={formatCoordinate(displayLatitude, displayLongitude)}
          />
          <InfoRow
            label="Cập nhật lúc"
            value={formatLastUpdate(displayLastUpdateMs)}
          />
          {displayAddress ? (
            <InfoRow label="Địa chỉ" value={displayAddress} />
          ) : null}
          <InfoRow
            label="Nguồn dữ liệu"
            value={isOnline !== true
              ? 'Dữ liệu ngoại tuyến'
              : isViewingLocalDevice
                ? 'Dữ liệu trên thiết bị này'
                : isDeviceOnline
                  ? 'Dữ liệu trực tuyến'
                  : 'Dữ liệu ngoại tuyến'}
            last
          />
        </SurfaceCard>

        {/* -- Remote offline warning -- */}
        {!isViewingLocalDevice && (isOnline === false || !isDeviceOnline) ? (
          <View style={styles.offlineWarning}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineText}>
              Thiết bị này đang mất kết nối. Dữ liệu có thể không cập nhật.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
  },
  deviceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  deviceHeaderLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  deviceName: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  deviceTypeBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  deviceTypeBadgeLocal: {
    backgroundColor: colors.onlineSoft,
  },
  deviceTypeBadgeRemote: {
    backgroundColor: colors.primarySoft,
  },
  deviceTypeBadgeText: {
    ...typography.label,
    fontSize: 10,
  },
  deviceTypeBadgeTextLocal: {
    color: colors.online,
  },
  deviceTypeBadgeTextRemote: {
    color: colors.primary,
  },
  offlineDot: {
    backgroundColor: colors.offline,
    borderRadius: radius.pill,
    height: 8,
    marginRight: spacing.sm,
    marginTop: 3,
    width: 8,
  },
  offlineText: {
    ...typography.caption,
    color: colors.offline,
    flex: 1,
    lineHeight: 18,
  },
  offlineWarning: {
    alignItems: 'flex-start',
    backgroundColor: colors.offlineSoft,
    borderColor: colors.offline,
    borderRadius: radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    padding: spacing.md,
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
  speedHero: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.large,
    padding: spacing.xl,
  },
  speedLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  speedSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  speedValue: {
    color: colors.surface,
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: spacing.sm,
  },
  statusBadgeRow: {
    marginBottom: spacing.sm,
  },
  stopCard: {
    marginTop: spacing.sm,
  },
  stopLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  stopValue: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: spacing.xs,
  },
});
