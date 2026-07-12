import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark, EmptyStateIllustration } from '../../components/branding';
import { TrackIcon } from '../../components/icons';
import { DeviceMapMarker, MapErrorBoundary } from '../../components/map';
import { AppHeader, StatusBadge } from '../../components/ui';
import { MainRoutes, TabRoutes } from '../../constants/routes';
import {
  useAuth,
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

function HeroCard({ connectionStatus, deviceName, isLocal, onPress, speedKmh, status }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.heroCard,
        shadows.cardMedium,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Xem chi tiết theo dõi trực tiếp"
      hitSlop={4}
    >
      <View style={styles.heroTop}>
        <View style={styles.heroDeviceRow}>
          <Text style={styles.heroDeviceName} numberOfLines={2}>{deviceName}</Text>
          <View style={[styles.typeBadge, isLocal ? styles.localBadge : styles.remoteBadge]}>
            <Text style={[styles.typeBadgeText, isLocal ? styles.localBadgeText : styles.remoteBadgeText]}>
              {isLocal ? 'Thiết bị này' : 'Từ xa'}
            </Text>
          </View>
        </View>
        <StatusBadge status={connectionStatus} label={formatStatus(connectionStatus)} size="sm" />
      </View>
      <Text style={styles.heroSpeedValue} numberOfLines={1} adjustsFontSizeToFit>
        {formatSpeed(speedKmh, { emptyForInvalid: !isLocal })}
      </Text>
      <Text style={styles.heroSpeedLabel}>
        {connectionStatus === 'Offline' ? 'Tốc độ gần nhất' : 'Tốc độ hiện tại'}
      </Text>
      <View style={styles.heroStatusRow}>
        <StatusBadge status={status} label={formatStatus(status)} />
      </View>
      <Text style={styles.heroDetailAction}>Xem chi tiết</Text>
    </Pressable>
  );
}

function QuickMetric({ icon, label, value }) {
  return (
    <View style={[styles.quickMetric, shadows.card]}>
      <View style={styles.metricHeader}>
        <TrackIcon name={icon} size={20} />
        <Text style={styles.quickMetricLabel}>{label}</Text>
      </View>
      <Text style={styles.quickMetricValue}>{value}</Text>
    </View>
  );
}

function DeviceChip({ isLocal, isSelected, name, onPress }) {
  return (
    <Pressable
      style={[styles.deviceChip, isSelected && styles.deviceChipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${isLocal ? 'Thiết bị này' : 'Thiết bị từ xa'}`}
      hitSlop={4}
    >
      <Text style={[styles.deviceChipName, isSelected && styles.deviceChipSelectedText]} numberOfLines={2}>
        {name}
      </Text>
      <Text style={[styles.deviceChipBadge, isSelected && styles.deviceChipSelectedBadge]}>
        {isLocal ? 'Thiết bị này' : 'Từ xa'}
      </Text>
    </Pressable>
  );
}

function MapOfflineState({ message, title = 'Bạn đang ngoại tuyến' }) {
  return (
    <View style={styles.mapState}>
      <EmptyStateIllustration type="offline" height={92} />
      <Text style={styles.mapStateTitle}>{title}</Text>
      <Text style={styles.mapStateText}>{message}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isOnline } = useConnectivity();
  const {
    devices,
    loading: deviceLoading,
    localDeviceId,
    localDeviceName,
    selectDevice,
    selectedDevice,
    selectedDeviceId,
  } = useDevice();
  const {
    activeTripMaxSpeedKmh,
    connectionStatus,
    currentSpeedKmh,
    status,
    stoppedDurationMs,
    todayDistanceKm,
    trackingState,
  } = useTracking();
  const {
    fleetDevices,
    isDeviceOnline,
    isViewingLocalDevice,
    lastUpdateMs,
    liveLocation,
    selectedFleetDevice,
  } = useLiveDevice();
  const [trackMiniMarkerChanges, setTrackMiniMarkerChanges] = useState(true);

  const selectedDeviceName =
    getDeviceName(selectedDevice) ||
    (selectedDeviceId === localDeviceId ? localDeviceName : null) ||
    'Chưa có thiết bị';
  const displayStatus = isViewingLocalDevice
    ? (trackingState.lastGpsAt ? status : liveLocation?.movementStatus ?? status)
    : liveLocation?.movementStatus ?? liveLocation?.status ?? null;
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
  const displayLatitude = isViewingLocalDevice ? trackingState.lastLatitude ?? liveLocation?.latitude : liveLocation?.latitude;
  const displayLongitude = isViewingLocalDevice ? trackingState.lastLongitude ?? liveLocation?.longitude : liveLocation?.longitude;
  const displayMaxSpeedKmh = isViewingLocalDevice
    ? (trackingState.lastGpsAt ? activeTripMaxSpeedKmh : liveLocation?.activeTripMaxSpeedKmh)
    : liveLocation?.activeTripMaxSpeedKmh;
  const displayTodayDistanceKm = isViewingLocalDevice
    ? (trackingState.lastGpsAt ? todayDistanceKm : liveLocation?.todayDistanceKm)
    : liveLocation?.todayDistanceKm;

  const validFleetDevices = useMemo(
    () => fleetDevices.filter((item) => item.hasValidCoordinate),
    [fleetDevices]
  );
  const miniMarkerAppearanceKey = validFleetDevices
    .map((item) => `${item.deviceId}:${item.isOnline}:${item.markerColor ?? ''}`)
    .join('|');

  useEffect(() => {
    setTrackMiniMarkerChanges(true);
    const timerId = setTimeout(() => setTrackMiniMarkerChanges(false), 500);
    return () => clearTimeout(timerId);
  }, [miniMarkerAppearanceKey]);
  const totalDeviceCount = devices.length > 0 ? devices.length : localDeviceId ? 1 : 0;
  const onlineCount = isOnline === false
    ? 0
    : fleetDevices.length > 0
      ? fleetDevices.filter((item) => item.isOnline).length
      : localDeviceId && connectionStatus === 'Online' ? 1 : 0;
  const initialRegion = useMemo(() => {
    const first = validFleetDevices[0]?.liveLocation;
    return {
      latitude: first?.latitude ?? 10.762622,
      longitude: first?.longitude ?? 106.660172,
      latitudeDelta: validFleetDevices.length > 1 ? 0.08 : 0.02,
      longitudeDelta: validFleetDevices.length > 1 ? 0.08 : 0.02,
    };
  }, [validFleetDevices]);

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          mode="transparent"
          title="Track Device"
          subtitle={user?.email ?? ''}
          rightSlot={(
            <View style={styles.localChip}>
              <View style={styles.localChipDot} />
              <Text style={styles.localChipText} numberOfLines={2}>
                {localDeviceName || 'Thiáº¿t bá»‹ nÃ y'}
              </Text>
            </View>
          )}
        />
        <HeroCard
          deviceName={selectedDeviceName}
          isLocal={isViewingLocalDevice}
          connectionStatus={displayConnectionStatus}
          onPress={() => navigation.getParent()?.navigate(MainRoutes.LiveTracking)}
          speedKmh={displaySpeedKmh}
          status={displayStatus}
        />
        <View style={styles.appHeader}>
          <BrandMark size={48} style={styles.headerBrand} />
          <View style={styles.headerText}>
            <Text style={styles.appName}>Track Device</Text>
            <Text style={styles.appEmail} numberOfLines={2}>{user?.email ?? ''}</Text>
          </View>
          <View style={styles.localChip}>
            <View style={styles.localChipDot} />
            <Text style={styles.localChipText} numberOfLines={2}>
              {localDeviceName || 'Thiết bị này'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>TỔNG QUAN THIẾT BỊ</Text>
        <View style={styles.metricsGrid}>
          <QuickMetric icon="device" label="Tổng số thiết bị" value={`${totalDeviceCount}`} />
          <QuickMetric icon="online" label="Trực tuyến" value={`${onlineCount}`} />
          <QuickMetric icon="lostConnection" label="Mất kết nối" value={`${Math.max(0, totalDeviceCount - onlineCount)}`} />
        </View>

        <View style={[styles.miniMapCard, shadows.card]}>
          <Text style={styles.cardTitle}>Vị trí thiết bị</Text>
          {isOnline !== true ? (
            <MapOfflineState
              title={isOnline == null ? 'Đang kiểm tra kết nối' : 'Bạn đang ngoại tuyến'}
              message={isOnline == null
                ? 'Bản đồ sẽ hiển thị sau khi kiểm tra kết nối hoàn tất.'
                : 'Không thể tải bản đồ khi không có kết nối Internet.'}
            />
          ) : validFleetDevices.length === 0 ? (
            <View style={styles.mapState}>
              <EmptyStateIllustration type="noCoordinates" height={88} />
              <Text style={styles.mapStateTitle}>Chưa có vị trí</Text>
              <Text style={styles.mapStateText}>Dữ liệu vị trí mới nhất sẽ xuất hiện tại đây.</Text>
            </View>
          ) : (
            <MapErrorBoundary
              resetKey={validFleetDevices.map((item) => item.deviceId).join('|')}
              fallback={<MapOfflineState title="Không thể tải bản đồ" message="Vui lòng mở bản đồ thiết bị và thử lại." />}
            >
              <MapView
                style={styles.miniMap}
                initialRegion={initialRegion}
                pointerEvents="none"
                showsUserLocation={false}
                showsMyLocationButton={false}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {validFleetDevices.map((item) => (
                  <Marker
                    key={item.deviceId}
                    coordinate={item.liveLocation}
                    anchor={{ x: 0.5, y: 0.5 }}
                    accessibilityLabel={`${item.name || 'Thiết bị'}, ${item.isOnline ? 'Trực tuyến' : `Mất kết nối ${formatLostConnectionDuration(item.lostConnectionDurationMs)}`}, ${formatStatus(item.liveLocation?.movementStatus ?? item.liveLocation?.status)}`}
                    accessible
                    tracksViewChanges={trackMiniMarkerChanges}
                  >
                    <DeviceMapMarker
                      isLocal={item.isLocalDevice}
                      isOnline={item.isOnline}
                      markerColor={item.markerColor}
                      size="sm"
                    />
                  </Marker>
                ))}
              </MapView>
            </MapErrorBoundary>
          )}
          <Pressable
            style={({ pressed }) => [styles.mapAction, pressed && styles.pressed]}
            onPress={() => navigation.navigate(TabRoutes.MapTab)}
            accessibilityRole="button"
            accessibilityLabel="Xem bản đồ thiết bị"
            hitSlop={4}
          >
            <TrackIcon name="liveMap" size={20} />
            <Text style={styles.mapActionText}>Xem bản đồ thiết bị</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>THIẾT BỊ ĐANG XEM</Text>
        <View style={styles.deviceSelectorWrap}>
          {deviceLoading ? (
            <Text style={styles.mutedText}>Đang tải thiết bị...</Text>
          ) : devices.length === 0 ? (
            <Text style={styles.mutedText}>Chưa có thiết bị trong tài khoản</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deviceChips}>
              {devices.map((device) => {
                const deviceId = device.deviceId ?? device.id;
                return (
                  <DeviceChip
                    key={deviceId}
                    name={getDeviceName(device)}
                    isLocal={deviceId === localDeviceId}
                    isSelected={deviceId === selectedDeviceId}
                    onPress={() => selectDevice(deviceId)}
                  />
                );
              })}
            </ScrollView>
          )}
        </View>

        <HeroCard
          deviceName={selectedDeviceName}
          isLocal={isViewingLocalDevice}
          connectionStatus={displayConnectionStatus}
          onPress={() => navigation.getParent()?.navigate(MainRoutes.LiveTracking)}
          speedKmh={displaySpeedKmh}
          status={displayStatus}
        />

        <Text style={styles.sectionLabel}>THÔNG SỐ</Text>
        <View style={styles.metricsGrid}>
          <QuickMetric icon="maxSpeed" label="Tốc độ max" value={formatSpeed(displayMaxSpeedKmh, { emptyForInvalid: true })} />
          <QuickMetric icon="stoppedDuration" label="Thời gian dừng" value={Number.isFinite(displayStoppedDurationMs) ? formatStoppedDuration(displayStoppedDurationMs) : 'Chưa có dữ liệu'} />
          {displayConnectionStatus === 'Offline' ? (
            <QuickMetric
              icon="lostConnection"
              label="Mất kết nối"
              value={formatLostConnectionDuration(selectedFleetDevice?.lostConnectionDurationMs)}
            />
          ) : null}
          <QuickMetric icon="distance" label="Quãng đường hôm nay" value={Number.isFinite(displayTodayDistanceKm) ? `${displayTodayDistanceKm.toFixed(2)} km` : 'Chưa có dữ liệu'} />
          <QuickMetric icon="coordinates" label="Tọa độ" value={formatCoordinate(displayLatitude, displayLongitude)} />
          <QuickMetric icon="lastUpdate" label="Cập nhật lúc" value={isViewingLocalDevice ? formatLastUpdate(trackingState.lastGpsAt ?? lastUpdateMs) : formatLastUpdate(lastUpdateMs)} />
          <QuickMetric
            icon={isOnline === true ? 'online' : 'offlineData'}
            label="Nguồn dữ liệu"
            value={
              isOnline !== true || (!isViewingLocalDevice && !isDeviceOnline)
                ? 'Dữ liệu ngoại tuyến'
                : isViewingLocalDevice
                  ? 'Dữ liệu trên thiết bị này'
                  : 'Dữ liệu trực tuyến'
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appEmail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  appHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  appName: { ...typography.screenTitle, color: colors.textPrimary },
  cardTitle: { ...typography.cardTitle, color: colors.textPrimary, marginBottom: spacing.sm },
  content: { padding: spacing.lg },
  deviceChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.medium, borderWidth: 1, marginRight: spacing.sm, minWidth: 130, maxWidth: 210, padding: spacing.sm + 2 },
  deviceChipBadge: { ...typography.label, color: colors.textMuted, marginTop: spacing.xs },
  deviceChipName: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  deviceChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  deviceChipSelectedBadge: { color: colors.primarySoft },
  deviceChipSelectedText: { color: colors.surface },
  deviceChips: { paddingBottom: spacing.xs, paddingTop: spacing.xs },
  deviceSelectorWrap: { marginBottom: spacing.md, minHeight: 52 },
  headerText: { flex: 1, marginRight: spacing.sm },
  headerBrand: { marginRight: spacing.sm },
  heroCard: { backgroundColor: colors.textPrimary, borderRadius: radius.large, marginBottom: spacing.sm, padding: spacing.xl },
  heroDeviceName: { ...typography.cardTitle, color: colors.surface, flex: 1, marginRight: spacing.sm },
  heroDeviceRow: { alignItems: 'center', flex: 1, flexDirection: 'row', flexWrap: 'wrap', marginRight: spacing.sm },
  heroDetailAction: { ...typography.button, color: colors.primarySoft, marginTop: spacing.md },
  heroSpeedLabel: { ...typography.label, color: colors.textMuted, marginTop: spacing.xs },
  heroSpeedValue: { color: colors.surface, fontSize: 48, fontWeight: '900', letterSpacing: 0, marginTop: spacing.lg },
  heroStatusRow: { marginTop: spacing.md },
  heroTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  localBadge: { backgroundColor: colors.onlineSoft },
  localBadgeText: { color: colors.online },
  localChip: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.medium, borderWidth: 1, flexDirection: 'row', maxWidth: '45%', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  localChipDot: { backgroundColor: colors.moving, borderRadius: radius.pill, height: 6, marginRight: spacing.xs, width: 6 },
  localChipText: { ...typography.caption, color: colors.textSecondary, flexShrink: 1, fontWeight: '600' },
  mapState: { alignItems: 'center', justifyContent: 'center', minHeight: 170, padding: spacing.lg },
  mapStateText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  mapStateTitle: { ...typography.cardTitle, color: colors.textPrimary, textAlign: 'center' },
  mapAction: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', padding: spacing.md },
  mapActionText: { ...typography.button, color: colors.primary },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  miniMap: { height: 190, width: '100%' },
  miniMapCard: { backgroundColor: colors.surface, borderRadius: radius.medium, marginBottom: spacing.sm, overflow: 'hidden', paddingTop: spacing.md },
  metricHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  mutedText: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.sm },
  pressed: { opacity: 0.8 },
  quickMetric: { backgroundColor: colors.surface, borderRadius: radius.medium, flexBasis: '47%', flexGrow: 1, minWidth: 130, padding: spacing.md },
  quickMetricLabel: { ...typography.label, color: colors.textMuted },
  quickMetricValue: { ...typography.caption, color: colors.textPrimary, flexWrap: 'wrap', fontWeight: '700', marginTop: spacing.xs },
  remoteBadge: { backgroundColor: colors.primarySoft },
  remoteBadgeText: { color: colors.primary },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  scroll: { flex: 1 },
  sectionLabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.lg },
  typeBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  typeBadgeText: { ...typography.label, fontSize: 10 },
});
