import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyStateIllustration } from '../../components/branding';
import { TrackIcon } from '../../components/icons';
import { DeviceMapMarker, MapErrorBoundary } from '../../components/map';
import { InfoRow, StatusBadge } from '../../components/ui';
import { useConnectivity, useDevice, useLiveDevice } from '../../contexts';
import { colors, radius, shadows, spacing, typography } from '../../theme';
import {
  EMPTY_VALUE,
  formatCoordinate,
  formatDistance,
  formatLostConnectionDuration,
  formatLastUpdate,
  formatSpeed,
  formatStoppedDuration,
  formatStatus,
} from '../../utils/format';

function createInitialRegion(devicesWithCoordinates) {
  const firstLocation = devicesWithCoordinates[0]?.liveLocation;
  return {
    latitude: firstLocation?.latitude ?? 10.762622,
    longitude: firstLocation?.longitude ?? 106.660172,
    latitudeDelta: devicesWithCoordinates.length > 1 ? 0.08 : 0.01,
    longitudeDelta: devicesWithCoordinates.length > 1 ? 0.08 : 0.01,
  };
}

function buildMarkerDisplayDevices(devicesWithCoordinates) {
  const groups = new Map();

  devicesWithCoordinates.forEach((device) => {
    const latitude = Number(device.liveLocation?.latitude);
    const longitude = Number(device.liveLocation?.longitude);
    const key = `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
    const group = groups.get(key) ?? [];
    group.push(device);
    groups.set(key, group);
  });

  return devicesWithCoordinates.map((device) => {
    const latitude = Number(device.liveLocation?.latitude);
    const longitude = Number(device.liveLocation?.longitude);
    const key = `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
    const group = groups.get(key) ?? [];
    const index = group.findIndex((item) => item.deviceId === device.deviceId);

    if (group.length <= 1 || index < 0) {
      return { ...device, markerCoordinate: device.liveLocation };
    }

    const angle = (Math.PI * 2 * index) / group.length;
    const offset = 0.000045;

    return {
      ...device,
      markerCoordinate: {
        latitude: latitude + Math.sin(angle) * offset,
        longitude: longitude + Math.cos(angle) * offset,
      },
    };
  });
}

function OfflineMapState({ checking, message, onRetry, title }) {
  return (
    <View style={styles.offlineState}>
      <EmptyStateIllustration type="offline" height={120} />
      <Text style={styles.offlineTitle}>{title}</Text>
      <Text style={styles.offlineMessage}>{message}</Text>
      <Pressable
        style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
        onPress={onRetry}
        disabled={checking}
        accessibilityRole="button"
        accessibilityLabel="Thử lại kết nối"
        hitSlop={6}
      >
        <TrackIcon name="retry" size={20} color={colors.surface} />
        <Text style={styles.retryButtonText}>{checking ? 'Đang kiểm tra...' : 'Thử lại'}</Text>
      </Pressable>
    </View>
  );
}

function PanelMetric({ icon, label, value }) {
  return (
    <View style={styles.detailMetric}>
      <TrackIcon name={icon} size={20} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function DeviceDetailCard({ expanded, fleetDevice, isInternetOnline }) {
  if (!fleetDevice) {
    return (
      <View style={styles.emptyDetail}>
        <Text style={styles.emptyDetailTitle}>Chọn một thiết bị</Text>
        <Text style={styles.emptyDetailText}>Chạm vào marker để xem thông tin chi tiết.</Text>
      </View>
    );
  }

  const location = fleetDevice.liveLocation ?? {};
  const isOnline = isInternetOnline && fleetDevice.isOnline;
  const movementStatus = location.movementStatus ?? location.status ?? null;
  const batteryLevel = Number.isFinite(location.batteryLevel)
    ? `${Math.round(location.batteryLevel)}%`
    : null;

  return (
    <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent}>
      <View style={styles.detailHeader}>
        <View style={styles.detailTitleWrap}>
          <Text style={styles.detailTitle} numberOfLines={2}>{fleetDevice.name || 'Thiết bị'}</Text>
          <Text style={styles.detailType}>{fleetDevice.isLocalDevice ? 'Thiết bị này' : 'Thiết bị từ xa'}</Text>
        </View>
        <StatusBadge status={isOnline ? 'Online' : 'Offline'} label={isOnline ? 'Trực tuyến' : 'Mất kết nối'} size="sm" />
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusLabelRow}>
          <TrackIcon name="movement" size={20} />
          <Text style={styles.statusLabel}>Trạng thái hoạt động</Text>
        </View>
        <StatusBadge status={movementStatus ?? 'Idle'} label={formatStatus(movementStatus)} />
      </View>

      <View style={styles.detailGrid}>
        <PanelMetric icon="speed" label={isOnline ? 'Tốc độ hiện tại' : 'Tốc độ gần nhất'} value={formatSpeed(location.speedKmh, { emptyForInvalid: true })} />
        <PanelMetric icon="lastUpdate" label="Cập nhật" value={formatLastUpdate(fleetDevice.lastUpdateMs)} />
      </View>

      {!isOnline ? (
        <InfoRow
          label="Mất kết nối"
          value={formatLostConnectionDuration(fleetDevice.lostConnectionDurationMs)}
        />
      ) : null}

      {expanded ? (
        <>
          <View style={styles.detailGrid}>
            <PanelMetric icon="maxSpeed" label="Tốc độ max" value={formatSpeed(location.activeTripMaxSpeedKmh, { emptyForInvalid: true })} />
            <PanelMetric icon="stoppedDuration" label="Thời gian dừng" value={Number.isFinite(location.stoppedDurationMs) ? formatStoppedDuration(location.stoppedDurationMs) : EMPTY_VALUE} />
            <PanelMetric icon="distance" label="Quãng đường hôm nay" value={Number.isFinite(location.todayDistanceKm) ? formatDistance(location.todayDistanceKm) : EMPTY_VALUE} />
          </View>
          {batteryLevel ? <InfoRow label="Pin" value={batteryLevel} /> : null}
          <InfoRow label="Tọa độ" value={formatCoordinate(location.latitude, location.longitude)} />
          <InfoRow label="Địa chỉ" value={location.address || EMPTY_VALUE} />
          <InfoRow label="Nguồn dữ liệu" value={isOnline ? 'Dữ liệu trực tuyến' : 'Dữ liệu ngoại tuyến'} last />
        </>
      ) : null}
    </ScrollView>
  );
}

export default function FleetMapScreen() {
  const insets = useSafeAreaInsets();
  const { checking, isOnline, refreshConnectivity } = useConnectivity();
  const { devices, loading: devicesLoading, localDeviceId } = useDevice();
  const { errorsByDeviceId, fleetDevices, fleetLoading } = useLiveDevice();
  const mapRef = useRef(null);
  const [hasFitInitialMarkers, setHasFitInitialMarkers] = useState(false);
  const [selectedMapDeviceId, setSelectedMapDeviceId] = useState(localDeviceId);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [trackMarkerChanges, setTrackMarkerChanges] = useState(true);

  const devicesWithCoordinates = useMemo(
    () => fleetDevices.filter((device) => device.hasValidCoordinate),
    [fleetDevices]
  );
  const markerDevicesWithCoordinates = useMemo(
    () => buildMarkerDisplayDevices(devicesWithCoordinates),
    [devicesWithCoordinates]
  );
  const selectedFleetDevice = useMemo(
    () => fleetDevices.find((device) => device.deviceId === selectedMapDeviceId) ?? fleetDevices[0] ?? null,
    [fleetDevices, selectedMapDeviceId]
  );
  const initialRegion = useMemo(
    () => createInitialRegion(devicesWithCoordinates),
    [devicesWithCoordinates.length]
  );
  const onlineCount = isOnline === false
    ? 0
    : fleetDevices.filter((device) => device.isOnline).length;
  const hasListenerErrors = Object.keys(errorsByDeviceId).length > 0;
  const markerAppearanceKey = fleetDevices
    .map((device) => `${device.deviceId}:${device.isOnline}`)
    .join('|');

  useEffect(() => {
    if (!selectedMapDeviceId && fleetDevices.length > 0) {
      setSelectedMapDeviceId(localDeviceId ?? fleetDevices[0].deviceId);
    }
  }, [fleetDevices, localDeviceId, selectedMapDeviceId]);

  useEffect(() => {
    setTrackMarkerChanges(true);
    const timerId = setTimeout(() => setTrackMarkerChanges(false), 350);
    return () => clearTimeout(timerId);
  }, [markerAppearanceKey, selectedMapDeviceId]);

  function fitAllMarkers() {
    if (!mapRef.current || devicesWithCoordinates.length === 0) {
      return;
    }

    const coordinates = markerDevicesWithCoordinates.map(
      (device) => device.markerCoordinate
    );

    if (coordinates.length === 1) {
      mapRef.current.animateToRegion({ ...coordinates[0], latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);
      return;
    }

    mapRef.current.fitToCoordinates(coordinates, {
      animated: true,
      edgePadding: { bottom: 80, left: 48, right: 48, top: 100 },
    });
  }

  useEffect(() => {
    if (isOnline !== true || hasFitInitialMarkers || devicesWithCoordinates.length === 0) {
      return undefined;
    }

    const timerId = setTimeout(() => {
      fitAllMarkers();
      setHasFitInitialMarkers(true);
    }, 300);
    return () => clearTimeout(timerId);
  }, [devicesWithCoordinates.length, hasFitInitialMarkers, isOnline]);

  if (isOnline !== true) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <OfflineMapState
          checking={checking}
          onRetry={refreshConnectivity}
          title={isOnline == null ? 'Đang kiểm tra kết nối' : 'Bạn đang ngoại tuyến'}
          message={isOnline == null
            ? 'Bản đồ sẽ hiển thị sau khi kiểm tra kết nối hoàn tất.'
            : 'Không thể tải bản đồ khi không có kết nối Internet.'}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <View style={styles.mapContainer}>
        <MapErrorBoundary
          resetKey={`${isOnline}:${devicesWithCoordinates.length}`}
          fallback={(
            <View style={styles.mapErrorState}>
              <Text style={styles.emptyDetailTitle}>Không thể tải bản đồ</Text>
              <Text style={styles.emptyDetailText}>Vui lòng quay lại hoặc thử lại kết nối.</Text>
            </View>
          )}
        >
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {markerDevicesWithCoordinates.map((fleetDevice) => (
              <Marker
                key={fleetDevice.deviceId}
                coordinate={fleetDevice.markerCoordinate}
                anchor={{ x: 0.5, y: 0.75 }}
                zIndex={fleetDevice.deviceId === selectedFleetDevice?.deviceId ? 20 : fleetDevice.isLocalDevice ? 10 : 1}
              onPress={() => setSelectedMapDeviceId(fleetDevice.deviceId)}
              accessibilityLabel={`${fleetDevice.name || 'Thiết bị'}, ${fleetDevice.isOnline ? 'Trực tuyến' : `Mất kết nối ${formatLostConnectionDuration(fleetDevice.lostConnectionDurationMs)}`}, ${formatStatus(fleetDevice.liveLocation?.movementStatus ?? fleetDevice.liveLocation?.status)}`}
              accessible
              tracksViewChanges={trackMarkerChanges}
            >
                <DeviceMapMarker
                  isLocal={fleetDevice.isLocalDevice}
                  isOnline={fleetDevice.isOnline}
                  isSelected={fleetDevice.deviceId === selectedFleetDevice?.deviceId}
                />
              </Marker>
            ))}
          </MapView>
        </MapErrorBoundary>

        <View style={[styles.topOverlay, shadows.floating]} pointerEvents="box-none">
          <Text style={styles.overlayTitle}>Bản đồ thiết bị</Text>
          <Text style={styles.overlaySub}>{onlineCount} trực tuyến, {Math.max(0, devices.length - onlineCount)} mất kết nối</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.fitButton, shadows.floating, pressed && styles.pressed]}
          onPress={fitAllMarkers}
          accessibilityRole="button"
          accessibilityLabel="Hiển thị tất cả thiết bị trên bản đồ"
          hitSlop={6}
        >
          <TrackIcon name="expand" size={18} />
          <Text style={styles.fitButtonText}>Hiển thị tất cả</Text>
        </Pressable>

        {(devicesLoading || fleetLoading) ? (
          <View style={styles.loadingBadge}><Text style={styles.loadingBadgeText}>Đang tải...</Text></View>
        ) : null}
      </View>

      <View style={[styles.bottomPanel, shadows.floating, { paddingBottom: insets.bottom + spacing.md }]}>
        {hasListenerErrors ? (
          <Text style={styles.listenerWarning}>Một số thiết bị đang hiển thị dữ liệu đã lưu gần nhất.</Text>
        ) : null}
        {devices.length === 0 ? (
          <View style={styles.emptyDetail}>
            <EmptyStateIllustration type="noDevices" height={80} />
            <Text style={styles.emptyDetailTitle}>Chưa có thiết bị</Text>
            <Text style={styles.emptyDetailText}>Thiết bị trong tài khoản sẽ xuất hiện tại đây.</Text>
          </View>
        ) : devicesWithCoordinates.length === 0 ? (
          <View style={styles.emptyDetail}>
            <EmptyStateIllustration type="noCoordinates" height={80} />
            <Text style={styles.emptyDetailTitle}>Chưa có vị trí</Text>
            <Text style={styles.emptyDetailText}>Các thiết bị chưa có tọa độ hợp lệ để hiển thị.</Text>
          </View>
        ) : (
          <>
            <Pressable
              style={({ pressed }) => [styles.panelToggle, pressed && styles.pressed]}
              onPress={() => setPanelExpanded((current) => !current)}
              accessibilityRole="button"
              accessibilityLabel={panelExpanded ? 'Thu gọn thông tin thiết bị' : 'Mở rộng thông tin thiết bị'}
              hitSlop={6}
            >
              <TrackIcon name={panelExpanded ? 'collapse' : 'expand'} size={20} />
              <Text style={styles.panelToggleText}>{panelExpanded ? 'Thu gọn' : 'Xem thêm'}</Text>
            </Pressable>
            <DeviceDetailCard
              expanded={panelExpanded}
              fleetDevice={selectedFleetDevice}
              isInternetOnline={isOnline}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bottomPanel: { alignSelf: 'stretch', backgroundColor: colors.surface, maxHeight: '44%', minWidth: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, width: '100%' },
  detailContent: { alignSelf: 'stretch', minWidth: 0, paddingBottom: spacing.sm, width: '100%' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  detailHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  detailMetric: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.small, flexBasis: '47%', flexGrow: 1, minWidth: 130, padding: spacing.sm },
  detailScroll: { alignSelf: 'stretch', flexGrow: 0, minWidth: 0, width: '100%' },
  detailTitle: { ...typography.cardTitle, color: colors.textPrimary, flexShrink: 1 },
  detailTitleWrap: { flex: 1, marginRight: spacing.sm, minWidth: 0 },
  detailType: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  emptyDetail: { alignItems: 'center', padding: spacing.lg },
  emptyDetailText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  emptyDetailTitle: { ...typography.cardTitle, color: colors.textPrimary },
  fitButton: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.medium, bottom: spacing.lg, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, position: 'absolute', right: spacing.lg },
  fitButtonText: { ...typography.button, color: colors.primary },
  listenerWarning: { ...typography.caption, color: colors.warning, marginBottom: spacing.sm },
  loadingBadge: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, position: 'absolute', right: spacing.lg, top: spacing.lg },
  loadingBadgeText: { ...typography.caption, color: colors.textSecondary },
  map: { flex: 1 },
  mapErrorState: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.xl },
  mapContainer: { flex: 1, minHeight: 240 },
  metricLabel: { ...typography.label, color: colors.textMuted },
  metricValue: { ...typography.caption, color: colors.textPrimary, fontWeight: '700', marginTop: spacing.xs },
  offlineMessage: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, maxWidth: 320, textAlign: 'center' },
  offlineState: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.xl },
  offlineTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  overlaySub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  overlayTitle: { ...typography.cardTitle, color: colors.textPrimary },
  pressed: { opacity: 0.8 },
  panelToggle: { alignItems: 'center', alignSelf: 'flex-end', flexDirection: 'row', gap: spacing.xs, minHeight: 36, paddingHorizontal: spacing.sm },
  panelToggleText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  retryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.medium, flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 3 },
  retryButtonText: { ...typography.button, color: colors.surface },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  statusLabel: { ...typography.label, color: colors.textMuted, marginRight: spacing.sm },
  statusLabelRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  statusRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  topOverlay: { backgroundColor: colors.surface, borderRadius: radius.medium, left: spacing.lg, maxWidth: '70%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, position: 'absolute', top: spacing.lg },
});
