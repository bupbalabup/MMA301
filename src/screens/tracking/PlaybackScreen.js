import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { HISTORY_SOURCE } from '../../constants/history';
import { MapErrorBoundary } from '../../components/map';
import { useAuth, useDevice } from '../../contexts';
import { getTripPlaybackBySource } from '../../services/tracking';
import { interpolateGpsPosition } from '../../utils/geo';
import { colors, radius, shadows, spacing, typography } from '../../theme';
import {
  formatDateTime,
  formatDurationPlayback,
  formatPlaybackClock,
  formatPointCoordinate,
  formatSpeed,
  formatTimeWithSeconds,
} from '../../utils/format';

// --- Constants -----------------------------------------------------------------

const PLAYBACK_TICK_MS = 500;
const PLAYBACK_SPEEDS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
const MOVING_SPEED_LABEL_THRESHOLD_KMH = 5;

// --- Pure helpers --------------------------------------------------------------

function isValidPoint(point) {
  return (
    Number.isFinite(point?.latitude) &&
    Number.isFinite(point?.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180 &&
    Number.isFinite(point.timestamp)
  );
}

function getDefaultPlaybackSpeed(durationMs) {
  if (durationMs >= 60 * 60 * 1000) return 64;
  if (durationMs >= 10 * 60 * 1000) return 16;
  return 4;
}

function getPlaybackStatus(point, progressRatio) {
  if (!point) return 'Đỗ xe';
  if ((point.speedKmh ?? 0) > MOVING_SPEED_LABEL_THRESHOLD_KMH) return 'Đang di chuyển';
  if (progressRatio >= 1) return 'Đỗ xe';
  return 'Tạm dừng';
}

function findPlaybackPosition(points, targetTimestamp) {
  if (points.length === 0) return null;
  if (points.length === 1 || targetTimestamp <= points[0].timestamp) return points[0];
  const lastPoint = points[points.length - 1];
  if (targetTimestamp >= lastPoint.timestamp) return lastPoint;
  for (let i = 1; i < points.length; i += 1) {
    if (targetTimestamp <= points[i].timestamp) {
      return interpolateGpsPosition(points[i - 1], points[i], targetTimestamp);
    }
  }
  return lastPoint;
}

function getProgressPoints(points, currentPoint, targetTimestamp) {
  if (!currentPoint) return [];
  const traveled = points.filter((p) => p.timestamp <= targetTimestamp);
  const last = traveled[traveled.length - 1];
  if (!last || last.latitude !== currentPoint.latitude || last.longitude !== currentPoint.longitude) {
    return [...traveled, currentPoint];
  }
  return traveled;
}

function createInitialRegion(points) {
  const first = points[0];
  return {
    latitude: first?.latitude ?? 10.762622,
    longitude: first?.longitude ?? 106.660172,
    latitudeDelta: points.length > 1 ? 0.02 : 0.01,
    longitudeDelta: points.length > 1 ? 0.02 : 0.01,
  };
}

// --- Code-drawn vehicle marker -------------------------------------------------

function PlaybackVehicleMarker() {
  return (
    <View style={styles.markerWrap}>
      <View style={styles.vehicleNose} />
      <View style={styles.vehicleBody} />
    </View>
  );
}

// --- Main screen ----------------------------------------------------------------

function RouteEndpointMarker({ label, variant }) {
  const isStart = variant === 'start';

  return (
    <View style={styles.endpointMarker}>
      <View
        style={[
          styles.endpointDot,
          isStart ? styles.endpointDotStart : styles.endpointDotEnd,
        ]}
      />
      <View style={styles.endpointLabelWrap}>
        <Text style={styles.endpointLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function PlaybackScreen({ route }) {
  const insets = useSafeAreaInsets();
  const tripId = route?.params?.tripId;
  const source = route?.params?.source ?? HISTORY_SOURCE.LOCAL;
  const { user } = useAuth();
  const { devices, localDeviceId, deviceName } = useDevice();
  const deviceId = route?.params?.deviceId ?? localDeviceId;
  const mapRef = useRef(null);
  const progressBarWidthRef = useRef(1);
  const loadRequestIdRef = useRef(0);

  const [trip, setTrip] = useState(null);
  const [gpsPoints, setGpsPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(4);
  const [playbackOffsetMs, setPlaybackOffsetMs] = useState(0);
  const [hasFitMap, setHasFitMap] = useState(false);

  const playbackDeviceName = useMemo(() => {
    const matchedDevice = devices.find((device) => {
      return device.deviceId === deviceId || device.id === deviceId;
    });

    return (
      matchedDevice?.name ??
      matchedDevice?.deviceName ??
      matchedDevice?.platformLabel ??
      (deviceId === localDeviceId ? deviceName : null) ??
      'Thiết bị'
    );
  }, [deviceId, deviceName, devices, localDeviceId]);

  // -- Derived values --
  const playbackTiming = useMemo(() => {
    const first = gpsPoints[0] ?? null;
    const last = gpsPoints[gpsPoints.length - 1] ?? null;
    const startTime = trip?.startTime ?? first?.timestamp ?? 0;
    const endTime = trip?.endTime ?? last?.timestamp ?? startTime;
    const durationMs = Math.max(0, endTime - startTime);
    return { startTime, endTime, durationMs };
  }, [gpsPoints, trip]);

  const currentTimestamp = playbackTiming.startTime + playbackOffsetMs;

  const currentPoint = useMemo(
    () => findPlaybackPosition(gpsPoints, currentTimestamp),
    [currentTimestamp, gpsPoints]
  );

  const traveledPolyline = useMemo(
    () => getProgressPoints(gpsPoints, currentPoint, currentTimestamp),
    [currentPoint, currentTimestamp, gpsPoints]
  );

  const progressRatio =
    playbackTiming.durationMs > 0
      ? Math.min(1, Math.max(0, playbackOffsetMs / playbackTiming.durationMs))
      : 1;
  const isPlaybackAtEnd = progressRatio >= 1;

  const initialRegion = useMemo(() => createInitialRegion(gpsPoints), [gpsPoints]);
  const playbackStatus = getPlaybackStatus(currentPoint, progressRatio);

  // -- Data loading --
  const loadPlayback = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setPlaybackOffsetMs(0);
    setHasFitMap(false);

    try {
      const data = await getTripPlaybackBySource({
        source,
        uid: user?.uid,
        deviceId,
        tripId,
      });

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      if (!data) {
        setTrip(null);
        setGpsPoints([]);
        return;
      }

      const validPoints = (Array.isArray(data.gpsPoints) ? data.gpsPoints : [])
        .filter(isValidPoint)
        .sort((a, b) => a.timestamp - b.timestamp);

      const startTime = data.trip?.startTime ?? validPoints[0]?.timestamp ?? 0;
      const endTime = data.trip?.endTime ?? validPoints[validPoints.length - 1]?.timestamp ?? startTime;

      setTrip(data.trip);
      setGpsPoints(validPoints);
      setPlaybackSpeed(getDefaultPlaybackSpeed(Math.max(0, endTime - startTime)));
    } catch (playbackError) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      console.warn('Failed to load trip playback.', playbackError);
      setError('Không thể tải dữ liệu bản đồ hành trình. Vui lòng thử lại.');
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [deviceId, source, tripId, user?.uid]);

  useFocusEffect(
    useCallback(() => {
      loadPlayback();
      return () => {
        loadRequestIdRef.current += 1;
        setIsPlaying(false);
      };
    }, [loadPlayback])
  );

  // -- Playback ticker --
  useEffect(() => {
    if (!isPlaying || playbackTiming.durationMs <= 0) return undefined;

    const timerId = setInterval(() => {
      setPlaybackOffsetMs((prev) => {
        const next = prev + PLAYBACK_TICK_MS * playbackSpeed;
        if (next >= playbackTiming.durationMs) {
          setIsPlaying(false);
          return playbackTiming.durationMs;
        }
        return next;
      });
    }, PLAYBACK_TICK_MS);

    return () => clearInterval(timerId);
  }, [isPlaying, playbackSpeed, playbackTiming.durationMs]);

  // -- Auto-fit map on load --
  useEffect(() => {
    if (hasFitMap || gpsPoints.length === 0 || !mapRef.current) return undefined;

    const timerId = setTimeout(() => {
      if (gpsPoints.length === 1) {
        mapRef.current?.animateToRegion(createInitialRegion(gpsPoints), 500);
      } else {
        mapRef.current?.fitToCoordinates(gpsPoints, {
          animated: true,
          edgePadding: { bottom: 60, left: 40, right: 40, top: 60 },
        });
      }
      setHasFitMap(true);
    }, 300);

    return () => clearTimeout(timerId);
  }, [gpsPoints, hasFitMap]);

  // -- Controls --
  function play() {
    if (playbackTiming.durationMs <= 0) { setIsPlaying(false); setPlaybackOffsetMs(0); return; }
    if (playbackOffsetMs >= playbackTiming.durationMs) setPlaybackOffsetMs(0);
    setIsPlaying(true);
  }

  function pause() { setIsPlaying(false); }
  function jumpToStart() { setIsPlaying(false); setPlaybackOffsetMs(0); }
  function jumpToEnd() { setIsPlaying(false); setPlaybackOffsetMs(playbackTiming.durationMs); }

  function changePlaybackSpeed(direction) {
    const idx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const safe = idx >= 0 ? idx : 0;
    setPlaybackSpeed(PLAYBACK_SPEEDS[Math.min(PLAYBACK_SPEEDS.length - 1, Math.max(0, safe + direction))]);
  }

  function seekFromLocationX(locationX) {
    const width = progressBarWidthRef.current || 1;
    setPlaybackOffsetMs(Math.min(1, Math.max(0, locationX / width)) * playbackTiming.durationMs);
  }

  // -- State screens --
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.centerText}>Đang tải bản đồ hành trình...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Không thể tải hành trình</Text>
          <Text style={styles.centerText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadPlayback}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>Không tìm thấy chuyến đi</Text>
          <Text style={styles.centerText}>
            Chuyến đi này không còn tồn tại trong dữ liệu cục bộ.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (gpsPoints.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>Không có dữ liệu GPS</Text>
          <Text style={styles.centerText}>
            {source === HISTORY_SOURCE.CLOUD
              ? 'Bản đồ hành trình chưa có dữ liệu tuyến đường đã đồng bộ.'
              : 'Chuyến đi này chưa có điểm GPS hợp lệ được lưu trên thiết bị.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const startPoint = gpsPoints[0];
  const endPoint = gpsPoints[gpsPoints.length - 1];
  const markerHeading = Number.isFinite(currentPoint?.heading) ? currentPoint.heading : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      {/* -- Map area -- */}
      <View style={styles.mapContainer}>
        <MapErrorBoundary
          resetKey={`${source}:${deviceId}:${tripId}`}
          fallback={(
            <View style={styles.centerState}>
              <Text style={styles.errorTitle}>Không thể hiển thị bản đồ</Text>
              <Text style={styles.centerText}>Dữ liệu hành trình vẫn được giữ nguyên. Vui lòng quay lại và thử lại.</Text>
            </View>
          )}
        >
          <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          followsUserLocation={false}
        >
          {/* Full route ghost polyline */}
          {gpsPoints.length > 1 && (
            <Polyline
              coordinates={gpsPoints}
              strokeColor={colors.polylineBase}
              strokeWidth={4}
            />
          )}

          {/* Traveled polyline */}
          {traveledPolyline.length > 1 && (
            <Polyline
              coordinates={traveledPolyline}
              strokeColor={colors.polylineTraveled}
              strokeWidth={5}
            />
          )}

          {/* Start and end markers */}
          <Marker coordinate={startPoint} anchor={{ x: 0.5, y: 0.5 }}>
            <RouteEndpointMarker label="Bắt đầu" variant="start" />
          </Marker>
          <Marker coordinate={endPoint} anchor={{ x: 0.5, y: 0.5 }}>
            <RouteEndpointMarker label="Kết thúc" variant="end" />
          </Marker>

          {/* Playback vehicle marker */}
          {currentPoint && (
            <Marker
              coordinate={currentPoint}
              anchor={{ x: 0.5, y: 0.5 }}
              flat
            >
              <View
                style={[
                  styles.vehicleMarker,
                  { transform: [{ rotate: `${markerHeading}deg` }] },
                ]}
              >
                <PlaybackVehicleMarker />
              </View>
            </Marker>
          )}
          </MapView>
        </MapErrorBoundary>
      </View>

      <View style={[styles.pointInfoPanel, shadows.card]}>
        <View style={styles.pointInfoHeader}>
          <Text style={styles.pointInfoTitle} numberOfLines={1}>
            {playbackDeviceName}
          </Text>
          <Text style={styles.pointInfoStatus}>{playbackStatus}</Text>
        </View>
        <View style={styles.pointInfoGrid}>
          <View style={styles.pointInfoItem}>
            <Text style={styles.pointInfoLabel}>Tốc độ tại điểm</Text>
            <Text style={styles.pointInfoValue}>
              {formatSpeed(currentPoint?.speedKmh, { emptyForInvalid: true })}
            </Text>
          </View>
          <View style={styles.pointInfoItem}>
            <Text style={styles.pointInfoLabel}>Thời gian tại điểm</Text>
            <Text style={styles.pointInfoValue}>
              {formatTimeWithSeconds(currentTimestamp)}
            </Text>
          </View>
        </View>
        <Text style={styles.pointInfoLabel}>Tọa độ tại điểm</Text>
        <Text style={styles.pointInfoCoordinate} numberOfLines={1} adjustsFontSizeToFit>
          {formatPointCoordinate(currentPoint)}
        </Text>
      </View>

      {/* -- Controls panel -- */}
      <View style={[styles.controlPanel, shadows.floating]}>
        <ScrollView
          contentContainerStyle={[
            styles.controlContent,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {/* Trip info */}
          <Text style={styles.tripTitle}>
            {formatDateTime(playbackTiming.startTime)}
          </Text>
          <Text style={styles.tripSubtitle}>
            {formatDurationPlayback(playbackTiming.durationMs)}, {formatDateTime(playbackTiming.endTime)}
          </Text>

          {/* Current playback metrics */}
          <View style={styles.metricRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Tốc độ tại điểm</Text>
              <Text style={styles.metricValue}>
                {formatSpeed(currentPoint?.speedKmh)}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Thời gian tại điểm</Text>
              <Text style={styles.metricValue}>
                {formatTimeWithSeconds(currentTimestamp)}
              </Text>
            </View>
          </View>

          {/* Coordinate */}
          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>Tọa độ tại điểm</Text>
            <Text style={styles.coordValue}>
              {formatPointCoordinate(currentPoint)}
            </Text>
          </View>

          {/* Progress timeline */}
          <View
            style={styles.progressTrack}
            onLayout={(e) => { progressBarWidthRef.current = e.nativeEvent.layout.width; }}
            onStartShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
            onResponderGrant={(e) => { setIsPlaying(false); seekFromLocationX(e.nativeEvent.locationX); }}
            onResponderMove={(e) => { seekFromLocationX(e.nativeEvent.locationX); }}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${progressRatio * 100}%` },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressCaption}>Đã phát / Tổng thời lượng</Text>
            <Text style={styles.progressText}>
              {formatPlaybackClock(playbackOffsetMs)} / {formatPlaybackClock(playbackTiming.durationMs)}
            </Text>
          </View>

          {/* Playback buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              onPress={jumpToStart}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Về đầu</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
              onPress={isPlaying ? pause : play}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>
                {isPlaying ? 'Tạm dừng' : isPlaybackAtEnd ? 'Phát lại' : 'Phát'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              onPress={jumpToEnd}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Đến cuối</Text>
            </Pressable>
          </View>

          {/* Speed controls */}
          <View style={styles.speedControl}>
            <Pressable
              style={({ pressed }) => [styles.speedStepButton, pressed && styles.buttonPressed]}
              onPress={() => changePlaybackSpeed(-1)}
              accessibilityRole="button"
              accessibilityLabel="Chậm hơn"
            >
              <Text style={styles.speedStepText}>Chậm</Text>
            </Pressable>

            <View style={styles.speedDisplay}>
              <Text style={styles.speedDisplayLabel}>Tốc độ phát</Text>
              <Text style={styles.speedDisplayValue}>{playbackSpeed}x</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.speedStepButton, pressed && styles.buttonPressed]}
              onPress={() => changePlaybackSpeed(1)}
              accessibilityRole="button"
              accessibilityLabel="Nhanh hơn"
            >
              <Text style={styles.speedStepText}>Nhanh</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  buttonPressed: {
    opacity: 0.75,
  },
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
  controlContent: {
    padding: spacing.lg,
  },
  controlPanel: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: '48%',
  },
  coordLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  coordRow: {
    marginTop: spacing.xs,
  },
  coordValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
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
  endpointDot: {
    borderColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 16,
    width: 16,
  },
  endpointDotEnd: {
    backgroundColor: colors.offline,
  },
  endpointDotStart: {
    backgroundColor: colors.moving,
  },
  endpointLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  endpointLabelWrap: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.small,
    borderWidth: 1,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  endpointMarker: {
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  markerWrap: {
    alignItems: 'center',
  },
  metricBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.medium,
    flex: 1,
    padding: spacing.sm + 2,
  },
  metricLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  metricValue: {
    ...typography.metricMedium,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  pointInfoCoordinate: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  pointInfoGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  pointInfoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pointInfoItem: {
    flex: 1,
    minWidth: 0,
  },
  pointInfoLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  pointInfoPanel: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    minWidth: 0,
    padding: spacing.md,
  },
  pointInfoStatus: {
    ...typography.caption,
    color: colors.primary,
    flexShrink: 0,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  pointInfoTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
  },
  pointInfoValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    flex: 1,
    paddingVertical: spacing.sm + 3,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: '100%',
  },
  progressLabels: {
    marginTop: spacing.xs,
  },
  progressCaption: {
    ...typography.label,
    color: colors.textMuted,
  },
  progressText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  progressTrack: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    height: 20,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
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
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    flex: 1,
    paddingVertical: spacing.sm + 3,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  speedControl: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  speedDisplay: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.medium,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  speedDisplayLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  speedDisplayValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  speedStepButton: {
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: radius.medium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
  },
  speedStepText: {
    ...typography.button,
    color: colors.surface,
  },
  tripSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tripTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  vehicleBody: {
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderRadius: radius.small,
    borderWidth: 2,
    height: 24,
    width: 18,
  },
  vehicleMarker: {
    alignItems: 'center',
  },
  vehicleNose: {
    borderBottomColor: colors.primary,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderLeftWidth: 6,
    borderRightColor: 'transparent',
    borderRightWidth: 6,
    height: 0,
    width: 0,
  },
});
