import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  formatPendingTripCount,
  HISTORY_SOURCE,
  isTripPendingCloudSync,
} from '../../constants/history';
import { EmptyStateIllustration } from '../../components/branding';
import { TrackIcon } from '../../components/icons';
import { MainRoutes } from '../../constants/routes';
import { useAuth, useConnectivity, useDevice } from '../../contexts';
import {
  getCloudDailySummary,
  getDailySummary,
  listAvailableTripDates,
  listCloudAvailableTripDates,
  syncPendingTrips,
} from '../../services/tracking';
import { colors, radius, shadows, spacing, typography } from '../../theme';
import {
  formatDistance,
  formatDate,
  formatDurationHuman,
  formatLocation,
  formatSpeed,
  formatSyncStatus,
  formatTime,
  formatTripStatus,
} from '../../utils/format';

function DateChip({ date, isSelected, onPress }) {
  return (
    <Pressable
      style={[styles.dateChip, isSelected && styles.dateChipSelected]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.dateChipText,
          isSelected && styles.dateChipTextSelected,
        ]}
      >
        {formatDate(date)}
      </Text>
    </Pressable>
  );
}

function DeviceChip({ device, isLocal, isSelected, onPress }) {
  const name = device?.name ?? device?.deviceName ?? device?.platformLabel ?? 'Thiết bị';

  return (
    <Pressable
      style={[styles.deviceChip, isSelected && styles.deviceChipSelected]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.deviceChipName,
          isSelected && styles.deviceChipNameSelected,
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text
        style={[
          styles.deviceChipType,
          isSelected && styles.deviceChipTypeSelected,
        ]}
      >
        {isLocal ? 'Thiết bị này' : 'Từ xa'}
      </Text>
    </Pressable>
  );
}

function DaySummaryCard({ summary }) {
  if (!summary) {
    return null;
  }

  return (
    <View style={[styles.summaryCard, shadows.cardMedium]}>
      <Text style={styles.summaryDate}>{formatDate(summary.date)}</Text>
      <Text style={styles.summaryHighlight}>
        {summary.tripCount ?? 0} chuyến đi,{' '}
        {formatDistance(summary.totalDistanceKm)}
      </Text>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryItemLabel}>Thời gian chạy</Text>
          <Text style={styles.summaryItemValue}>
            {formatDurationHuman(summary.movingDurationMs)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryItemLabel}>Thời gian dừng</Text>
          <Text style={styles.summaryItemValue}>
            {formatDurationHuman(summary.stoppedDurationMs)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryItemLabel}>Tốc độ max</Text>
          <Text style={styles.summaryItemValue}>
            {formatSpeed(summary.maxSpeedKmh, { emptyForInvalid: true })}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryItemLabel}>Tốc độ TB</Text>
          <Text style={styles.summaryItemValue}>
            {formatSpeed(summary.avgSpeedKmh)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryItemLabel}>Số điểm GPS</Text>
          <Text style={styles.summaryItemValue}>
            {summary.gpsPointCount ?? 0}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TripCard({ index, isLocalHistory, onPress, trip }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.tripCard,
        shadows.card,
        pressed && styles.tripCardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.tripHeader}>
        <Text style={styles.tripIndex}>Chuyến {index + 1}</Text>
        <View style={styles.tripStatusBadge}>
          <Text style={styles.tripStatusText}>{formatTripStatus(trip.status)}</Text>
        </View>
      </View>

      <Text style={styles.tripTime}>
        {formatTime(trip.startTime)} đến {formatTime(trip.endTime)}
      </Text>

      <View style={styles.tripLocations}>
        <View style={styles.tripLocationRow}>
          <View style={[styles.locationDot, styles.locationDotStart]} />
          <Text style={styles.locationText} numberOfLines={2}>
            {formatLocation(
              trip.startAddress,
              trip.startLatitude,
              trip.startLongitude
            )}
          </Text>
        </View>
        <View style={styles.locationLine} />
        <View style={styles.tripLocationRow}>
          <View style={[styles.locationDot, styles.locationDotEnd]} />
          <Text style={styles.locationText} numberOfLines={2}>
            {formatLocation(
              trip.endAddress,
              trip.endLatitude,
              trip.endLongitude
            )}
          </Text>
        </View>
      </View>

      <View style={styles.tripMetrics}>
        <Text style={styles.tripMetricItem}>
          {formatDistance(trip.totalDistanceKm)}
        </Text>
        <View style={styles.tripMetricDivider} />
        <Text style={styles.tripMetricItem}>
          {formatDurationHuman(trip.durationMs)}
        </Text>
        <View style={styles.tripMetricDivider} />
        <Text style={styles.tripMetricItem}>
          Max {formatSpeed(trip.maxSpeedKmh, { emptyForInvalid: true })}
        </Text>
      </View>

      {isLocalHistory && String(trip.status).toLowerCase() === 'completed' ? (
        <Text style={styles.syncStatusText}>
          {formatSyncStatus(trip.cloudSyncStatus)}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isOnline, refreshConnectivity } = useConnectivity();
  const uid = user?.uid ?? null;
  const { devices, localDeviceId, localDeviceName } = useDevice();
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const selectedDateRef = useRef(null);
  const [selectedHistoryDeviceId, setSelectedHistoryDeviceId] = useState(null);
  const selectedHistoryDeviceIdRef = useRef(null);
  const hasHistoryContentRef = useRef(false);
  const lastLoadedHistoryDeviceIdRef = useRef(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncMessageError, setSyncMessageError] = useState(false);
  const [error, setError] = useState(null);
  const previousOnlineRef = useRef(isOnline);

  const deviceOptions = useMemo(() => {
    if (devices.length > 0) {
      return devices;
    }

    if (!localDeviceId) {
      return [];
    }

    return [
      {
        deviceId: localDeviceId,
        id: localDeviceId,
        name: localDeviceName,
      },
    ];
  }, [devices, localDeviceId, localDeviceName]);

  const selectedHistoryDevice = useMemo(
    () =>
      deviceOptions.find((device) => {
        return (
          device.deviceId === selectedHistoryDeviceId ||
          device.id === selectedHistoryDeviceId
        );
      }) ?? null,
    [deviceOptions, selectedHistoryDeviceId]
  );

  const isLocalHistory =
    !!selectedHistoryDeviceId && selectedHistoryDeviceId === localDeviceId;
  const sourceLabel = isLocalHistory
    ? 'Lịch sử lưu trên thiết bị này'
    : 'Lịch sử đồng bộ từ đám mây';

  const sortedTrips = useMemo(
    () =>
      [...(summary?.trips ?? [])].sort(
        (a, b) => (a.startTime ?? 0) - (b.startTime ?? 0)
      ),
    [summary]
  );
  const pendingSyncCount = useMemo(
    () =>
      isLocalHistory
        ? sortedTrips.filter(isTripPendingCloudSync).length
        : 0,
    [isLocalHistory, sortedTrips]
  );
  const pendingSyncMessage = formatPendingTripCount(pendingSyncCount);

  const isKnownDevice = useCallback(
    (deviceId) =>
      deviceOptions.some((device) => {
        return device.deviceId === deviceId || device.id === deviceId;
      }),
    [deviceOptions]
  );

  const getHistoryStorageKey = useCallback(() => {
    return uid ? `trackcam.selectedHistoryDeviceId.${uid}` : null;
  }, [uid]);

  useEffect(() => {
    let isMounted = true;

    async function restoreSelectedHistoryDevice() {
      if (!uid || deviceOptions.length === 0) {
        return;
      }

      const storageKey = getHistoryStorageKey();
      const savedDeviceId = storageKey
        ? await AsyncStorage.getItem(storageKey)
        : null;
      const nextDeviceId =
        savedDeviceId && isKnownDevice(savedDeviceId)
          ? savedDeviceId
          : localDeviceId && isKnownDevice(localDeviceId)
            ? localDeviceId
            : deviceOptions[0]?.deviceId ?? deviceOptions[0]?.id ?? null;

      if (!isMounted || !nextDeviceId) {
        return;
      }

      selectedHistoryDeviceIdRef.current = nextDeviceId;
      setSelectedHistoryDeviceId(nextDeviceId);
    }

    restoreSelectedHistoryDevice().catch((restoreError) => {
      console.warn('Failed to restore history device.', restoreError);
    });

    return () => {
      isMounted = false;
    };
  }, [
    deviceOptions,
    getHistoryStorageKey,
    isKnownDevice,
    localDeviceId,
    uid,
  ]);

  const loadHistory = useCallback(
    async ({ refresh = false, preferredDate = selectedDateRef.current } = {}) => {
      const showRefreshIndicator = refresh && hasHistoryContentRef.current;

      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const historyDeviceId =
          selectedHistoryDeviceIdRef.current ??
          (localDeviceId && isKnownDevice(localDeviceId)
            ? localDeviceId
            : deviceOptions[0]?.deviceId ?? deviceOptions[0]?.id ?? null);

        if (!historyDeviceId) {
          setAvailableDates([]);
          setSummary(null);
          hasHistoryContentRef.current = false;
          return;
        }

        selectedHistoryDeviceIdRef.current = historyDeviceId;
        lastLoadedHistoryDeviceIdRef.current = historyDeviceId;
        setSelectedHistoryDeviceId(historyDeviceId);

        const localHistory = historyDeviceId === localDeviceId;

        const dates = localHistory
          ? await listAvailableTripDates()
          : await listCloudAvailableTripDates(uid, historyDeviceId);
        setAvailableDates(dates);
        hasHistoryContentRef.current = dates.length > 0;

        const nextDate =
          preferredDate && dates.includes(preferredDate)
            ? preferredDate
            : dates[0] ?? null;

        selectedDateRef.current = nextDate;
        setSelectedDate(nextDate);

        if (!nextDate) {
          setSummary(null);
          return null;
        }

        const nextSummary = localHistory
          ? await getDailySummary(nextDate)
          : await getCloudDailySummary(uid, historyDeviceId, nextDate);
        setSummary(nextSummary);
        return nextSummary;
      } catch (historyError) {
        console.warn('Failed to load trip history.', historyError);
        setError('Không thể tải lịch sử hành trình. Vui lòng thử lại.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [deviceOptions, isKnownDevice, isOnline, localDeviceId, uid]
  );

  useFocusEffect(
    useCallback(() => {
      loadHistory({ refresh: true });
    }, [loadHistory])
  );

  useEffect(() => {
    if (
      !selectedHistoryDeviceId ||
      selectedHistoryDeviceId === lastLoadedHistoryDeviceIdRef.current
    ) {
      return;
    }

    loadHistory({ preferredDate: selectedDateRef.current });
  }, [loadHistory, selectedHistoryDeviceId]);

  useEffect(() => {
    const wasOnline = previousOnlineRef.current;
    previousOnlineRef.current = isOnline;

    if (
      wasOnline === true ||
      isOnline !== true ||
      !uid ||
      !localDeviceId ||
      selectedHistoryDeviceIdRef.current !== localDeviceId
    ) {
      return;
    }

    let isCurrent = true;
    syncPendingTrips(uid, localDeviceId)
      .then(() => {
        if (isCurrent) {
          return loadHistory({ refresh: true });
        }
        return null;
      })
      .catch((syncError) => {
        if (isCurrent) {
          console.warn('Failed to refresh History after reconnecting.', syncError);
          setSyncMessage('Không thể đồng bộ hành trình sau khi kết nối lại.');
          setSyncMessageError(true);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [isOnline, loadHistory, localDeviceId, uid]);

  async function selectDate(date) {
    selectedDateRef.current = date;
    setSelectedDate(date);
    await loadHistory({ preferredDate: date });
  }

  async function selectHistoryDevice(deviceId) {
    if (!deviceId) {
      return;
    }

    selectedHistoryDeviceIdRef.current = deviceId;
    selectedDateRef.current = null;
    setSelectedHistoryDeviceId(deviceId);
    setSelectedDate(null);

    const storageKey = getHistoryStorageKey();
    if (storageKey) {
      AsyncStorage.setItem(storageKey, deviceId).catch((storageError) => {
        console.warn('Failed to save selected history device.', storageError);
      });
    }

    await loadHistory({ preferredDate: null });
  }

  async function retryPendingSync() {
    if (!uid || !localDeviceId || syncing) {
      return;
    }

    setSyncing(true);
    setSyncMessage('');
    setSyncMessageError(false);
    try {
      const online = await refreshConnectivity();

      if (!online) {
        setSyncMessage('Bạn đang ngoại tuyến. Hành trình sẽ được đồng bộ khi có kết nối.');
        setSyncMessageError(true);
        return;
      }

      const results = await syncPendingTrips(uid, localDeviceId);
      const failedResults = results.filter((result) => !result.ok);
      const refreshedSummary = await loadHistory({ refresh: true });
      const remainingPendingCount = (refreshedSummary?.trips ?? []).filter(
        isTripPendingCloudSync
      ).length;
      if (failedResults.length > 0) {
        setSyncMessage(`Không thể đồng bộ ${failedResults.length} chuyến đi. Vui lòng thử lại.`);
        setSyncMessageError(true);
      } else if (remainingPendingCount > 0) {
        setSyncMessage(formatPendingTripCount(remainingPendingCount));
        setSyncMessageError(true);
      } else if (results.length === 0) {
        setSyncMessage('Không có dữ liệu mới cần đồng bộ.');
      } else {
        setSyncMessage(`Đã đồng bộ ${results.length} chuyến đi.`);
      }
    } catch (syncError) {
      console.warn('Failed to sync local trip history.', syncError);
      setSyncMessage('Không thể đồng bộ hành trình. Vui lòng thử lại.');
      setSyncMessageError(true);
    } finally {
      setSyncing(false);
    }
  }

  function openTrip(tripId) {
    navigation.navigate(MainRoutes.TripDetail, {
      tripId,
      deviceId: selectedHistoryDeviceId,
      source: isLocalHistory ? HISTORY_SOURCE.LOCAL : HISTORY_SOURCE.CLOUD,
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.centerText}>Đang tải lịch sử...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Không thể tải lịch sử</Text>
          <Text style={styles.centerText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => loadHistory()}
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  function renderHeader() {
    return (
      <View>
        <Text style={styles.screenTitle}>Lịch sử hành trình</Text>
        <Text style={styles.screenSubtitle}>{sourceLabel}</Text>

        <Text style={styles.sectionLabel}>THIẾT BỊ LỊCH SỬ</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.deviceChips}
        >
          {deviceOptions.map((device) => {
            const deviceId = device.deviceId ?? device.id;

            return (
              <DeviceChip
                key={deviceId}
                device={device}
                isLocal={deviceId === localDeviceId}
                isSelected={deviceId === selectedHistoryDeviceId}
                onPress={() => selectHistoryDevice(deviceId)}
              />
            );
          })}
        </ScrollView>

        <View style={styles.sourceBadge}>
          <Text style={styles.sourceBadgeText} numberOfLines={1}>
            {selectedHistoryDevice?.name ??
              selectedHistoryDevice?.deviceName ??
              selectedHistoryDevice?.platformLabel ??
              'Thiết bị'}
          </Text>
          <Text style={styles.sourceBadgeSubtext}>
            {isLocalHistory ? 'Thiết bị này' : 'Từ xa'}
          </Text>
        </View>

        {isLocalHistory ? (
          <View>
            <Pressable
              style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
              onPress={retryPendingSync}
              disabled={syncing}
              accessibilityRole="button"
            >
              <TrackIcon name={syncing ? 'pendingSync' : 'sync'} size={20} />
              <Text style={styles.syncButtonText}>
                {syncing ? 'Đang đồng bộ' : 'Đồng bộ các chuyến đang chờ'}
              </Text>
            </Pressable>
            <Text
              style={[
                styles.pendingSyncText,
                pendingSyncCount > 0 && styles.pendingSyncTextAttention,
              ]}
            >
              {pendingSyncMessage}
            </Text>
            {syncMessage ? (
              <View style={styles.syncMessageRow}>
                {syncMessageError ? <TrackIcon name="lostConnection" size={20} /> : null}
                <Text style={[styles.syncMessage, syncMessageError && styles.syncMessageError]}>
                  {syncMessage}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>CHỌN NGÀY</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateChips}
        >
          {availableDates.map((date) => (
            <DateChip
              key={date}
              date={date}
              isSelected={date === selectedDate}
              onPress={() => selectDate(date)}
            />
          ))}
        </ScrollView>

        <DaySummaryCard
          summary={summary ? { ...summary, date: selectedDate } : null}
        />

        <Text style={styles.sectionLabel}>CHUYẾN ĐI TRONG NGÀY</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <FlatList
        data={sortedTrips}
        keyExtractor={(trip) => trip.id}
        renderItem={({ item, index }) => (
          <TripCard
            index={index}
            isLocalHistory={isLocalHistory}
            trip={item}
            onPress={() => openTrip(item.id)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={[styles.emptyCard, shadows.card]}>
            <EmptyStateIllustration type="noHistory" height={104} style={styles.emptyIllustration} />
            <Text style={styles.emptyTitle}>Chưa có chuyến đi</Text>
            <Text style={styles.emptyBody}>
              Các chuyến đi được ghi tự động hoặc đồng bộ sẽ xuất hiện tại đây.
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.md },
        ]}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            refreshing={refreshing && !loading}
            onRefresh={() => loadHistory({ refresh: true })}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerState: {
    alignItems: 'center',
    flexGrow: 1,
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
  dateChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateChipText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  dateChipTextSelected: {
    color: colors.surface,
  },
  dateChips: {
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
  },
  deviceChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    marginRight: spacing.sm,
    maxWidth: 180,
    minWidth: 132,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  deviceChipName: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  deviceChipNameSelected: {
    color: colors.surface,
  },
  deviceChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  deviceChipType: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: 2,
  },
  deviceChipTypeSelected: {
    color: colors.surface,
  },
  deviceChips: {
    paddingBottom: spacing.xs,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyIllustration: {
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.large,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.xl,
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
  locationDot: {
    borderRadius: radius.pill,
    height: 8,
    marginRight: spacing.sm,
    marginTop: 4,
    width: 8,
  },
  locationDotEnd: {
    backgroundColor: colors.offline,
  },
  locationDotStart: {
    backgroundColor: colors.moving,
  },
  locationLine: {
    backgroundColor: colors.border,
    borderRadius: 1,
    height: 12,
    marginLeft: 3,
    marginVertical: 2,
    width: 2,
  },
  locationText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
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
  screenSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  screenTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  sourceBadge: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  sourceBadgeSubtext: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: 2,
  },
  sourceBadgeText: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  summaryCard: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.large,
    padding: spacing.xl,
  },
  summaryDate: {
    ...typography.label,
    color: colors.textMuted,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  summaryHighlight: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: spacing.xs,
  },
  summaryItem: {
    flexBasis: '46%',
    flexGrow: 1,
  },
  summaryItemLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  summaryItemValue: {
    ...typography.caption,
    color: colors.borderStrong,
    fontWeight: '700',
    marginTop: 2,
  },
  syncButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 3,
  },
  syncButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncMessage: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.sm,
  },
  syncMessageError: {
    color: colors.danger,
  },
  syncMessageRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pendingSyncText: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.sm,
  },
  pendingSyncTextAttention: {
    color: colors.warning,
  },
  syncStatusText: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  tripCardPressed: {
    opacity: 0.8,
  },
  tripHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  tripIndex: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  tripLocationRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  tripLocations: {
    marginTop: spacing.sm,
  },
  tripMetricDivider: {
    backgroundColor: colors.border,
    borderRadius: 1,
    height: '100%',
    width: 1,
  },
  tripMetricItem: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
    fontWeight: '700',
  },
  tripMetrics: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.small,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  tripStatusBadge: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tripStatusText: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 10,
  },
  tripTime: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
});
