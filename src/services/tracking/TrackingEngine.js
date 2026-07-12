import { GpsEngine } from '../location';
import { updateLiveLocation } from '../firebase/liveLocationService';
import {
  DEFAULT_GPS_INTERVAL_MS,
  GPS_LOST_TIMEOUT_MS,
  MAX_ACCEPTABLE_ACCURACY_METERS,
  MAX_JUMP_DISTANCE_METERS,
  MIN_VALID_POINT_INTERVAL_MS,
  MOVING_DISTANCE_THRESHOLD_METERS,
  MOVING_SPEED_THRESHOLD_KMH,
  PARKING_DURATION_MS,
  PARKING_RADIUS_METERS,
  SINGLE_POINT_SPIKE_SPEED_KMH,
  SPIKE_CONFIRMATION_COUNT,
  TEMPORARY_STOP_DURATION_MS,
  TRACKING_STATUS,
} from '../../constants/tracking';
import {
  calculateDistanceKm,
  calculateSpeedKmh,
  normalizeLocationToPoint,
} from '../../utils/geo';
import { getTodayDateKey } from '../../utils/date';
import {
  addLocationToTrip,
  completeAutoTrip,
  createAutoTrip,
  getTodayDistanceKm,
  interruptAutoTrip,
} from './tripService';
import { syncCompletedTrip } from './tripCloudSyncService';
import {
  buildForegroundServiceOptions,
  buildLiveTrackingNotificationContent,
  rememberVisibleLiveTrackingNotification,
  rememberNotificationLocationOptions,
  resetLiveTrackingNotificationCache,
  updateLiveTrackingForegroundNotification,
} from './liveTrackingNotificationService';

const METERS_PER_KILOMETER = 1000;
const CONNECTION_STATUS = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
};
const STOPPED_DURATION_TICK_MS = 1000;

const notificationPresentation = {
  deviceName: null,
  isNetworkOnline: true,
};

const state = {
  uid: null,
  deviceId: null,
  isInitialized: false,
  isEnabled: false,
  movementStatus: TRACKING_STATUS.IDLE,
  connectionStatus: CONNECTION_STATUS.ONLINE,
  activeTripId: null,
  activeTrip: null,
  startedAt: null,
  currentSpeedKmh: 0,
  activeTripMaxSpeedKmh: 0,
  todayDistanceKm: 0,
  todayDateKey: null,
  stoppedDurationMs: 0,
  stoppedSince: null,
  lastGpsPoint: null,
  lastParkingLocation: null,
  lastMeaningfulMovementAt: null,
  parkingCandidateStartedAt: null,
  lastMeaningfulGpsPoint: null,
  lastGpsAt: null,
  pendingSpikePoints: [],
  isCompletingTrip: false,
};

const listeners = new Set();
let unsubscribeFromGps = null;
let gpsLostTimer = null;
let stoppedDurationTimer = null;
let isDisablingTracking = false;

function logLifecycle(action, reason) {
  console.log(`[TrackingEngine] ${action} reason: ${reason}`);
}

function logStatusChanges(previousState, nextState) {
  if (
    nextState.movementStatus &&
    nextState.movementStatus !== previousState.movementStatus
  ) {
    console.log(
      `[TrackingEngine] status change movementStatus: ${previousState.movementStatus} -> ${nextState.movementStatus}`
    );
  }

  if (
    nextState.connectionStatus &&
    nextState.connectionStatus !== previousState.connectionStatus
  ) {
    console.log(
      `[TrackingEngine] status change connectionStatus: ${previousState.connectionStatus} -> ${nextState.connectionStatus}`
    );
  }

  if (
    typeof nextState.isEnabled === 'boolean' &&
    nextState.isEnabled !== previousState.isEnabled
  ) {
    console.log(
      `[TrackingEngine] status change isEnabled: ${previousState.isEnabled} -> ${nextState.isEnabled}`
    );
  }
}

function isSameTrackingContext(uid, deviceId) {
  return state.isInitialized && state.uid === uid && state.deviceId === deviceId;
}

function getPublicState() {
  const status =
    state.connectionStatus === CONNECTION_STATUS.OFFLINE
      ? TRACKING_STATUS.OFFLINE
      : state.movementStatus;

  return {
    isInitialized: state.isInitialized,
    isEnabled: state.isEnabled,
    status,
    movementStatus: state.movementStatus,
    connectionStatus: state.connectionStatus,
    activeTripId: state.activeTripId,
    startedAt: state.startedAt,
    deviceId: state.deviceId,
    lastGpsAt: state.lastGpsAt,
    currentSpeedKmh: state.currentSpeedKmh,
    activeTripMaxSpeedKmh: state.activeTripMaxSpeedKmh,
    todayDistanceKm: state.todayDistanceKm,
    stoppedDurationMs: state.stoppedDurationMs,
    stoppedSince: state.stoppedSince,
    lastSpeedKmh: state.currentSpeedKmh,
    lastLatitude: state.lastGpsPoint?.latitude ?? null,
    lastLongitude: state.lastGpsPoint?.longitude ?? null,
  };
}

function notifyState() {
  const publicState = getPublicState();

  listeners.forEach((callback) => {
    callback(publicState);
  });
}

function getNotificationConnectionStatus() {
  if (notificationPresentation.isNetworkOnline === false) {
    return CONNECTION_STATUS.OFFLINE;
  }

  return state.connectionStatus;
}

function getNotificationContent() {
  return buildLiveTrackingNotificationContent({
    connectionStatus: getNotificationConnectionStatus(),
    deviceName: notificationPresentation.deviceName,
    movementStatus: state.movementStatus,
    speedKmh: state.currentSpeedKmh,
  });
}

function refreshForegroundNotification({ force = false } = {}) {
  if (!state.isEnabled) {
    return;
  }

  updateLiveTrackingForegroundNotification({
    connectionStatus: getNotificationConnectionStatus(),
    deviceName: notificationPresentation.deviceName,
    force,
    movementStatus: state.movementStatus,
    speedKmh: state.currentSpeedKmh,
  }).catch((error) => {
    console.warn('Failed to update live tracking notification.', error);
  });
}

function setState(nextState) {
  const previousState = {
    connectionStatus: state.connectionStatus,
    isEnabled: state.isEnabled,
    movementStatus: state.movementStatus,
  };

  Object.assign(state, nextState);
  logStatusChanges(previousState, nextState);
  notifyState();
  refreshForegroundNotification();
}

function calculateStoppedDurationMs(timestamp = Date.now()) {
  if (!state.stoppedSince) {
    return 0;
  }

  return Math.max(0, timestamp - state.stoppedSince);
}

function stopStoppedDurationTimer() {
  if (stoppedDurationTimer) {
    clearInterval(stoppedDurationTimer);
    stoppedDurationTimer = null;
  }
}

function resetStoppedDuration() {
  stopStoppedDurationTimer();

  if (!state.stoppedSince && state.stoppedDurationMs === 0) {
    return;
  }

  setState({
    stoppedDurationMs: 0,
    stoppedSince: null,
  });
}

function startStoppedDurationTimer() {
  if (stoppedDurationTimer) {
    return;
  }

  stoppedDurationTimer = setInterval(() => {
    if (!state.isEnabled || !state.stoppedSince) {
      stopStoppedDurationTimer();
      return;
    }

    const timestamp = Date.now();
    const stoppedDurationMs = calculateStoppedDurationMs(timestamp);
    const nextMovementStatus = state.activeTripId
      ? getStoppedMovementStatus(timestamp)
      : state.movementStatus;

    setState({
      stoppedDurationMs,
      movementStatus:
        state.movementStatus === TRACKING_STATUS.GPS_LOST ||
        state.movementStatus === TRACKING_STATUS.IDLE
          ? state.movementStatus
          : nextMovementStatus,
    });
  }, STOPPED_DURATION_TICK_MS);
}

function beginStoppedDuration(timestamp) {
  if (state.stoppedSince) {
    setState({
      stoppedDurationMs: calculateStoppedDurationMs(timestamp),
    });
    startStoppedDurationTimer();
    return;
  }

  setState({
    stoppedDurationMs: 0,
    stoppedSince: timestamp,
  });
  startStoppedDurationTimer();
}

function getDistanceMeters(pointA, pointB) {
  return calculateDistanceKm(pointA, pointB) * METERS_PER_KILOMETER;
}

function isPointCoordinateUsable(point) {
  return (
    Number.isFinite(point?.latitude) &&
    Number.isFinite(point?.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

function isPointTimestampUsable(point) {
  return Number.isFinite(point?.timestamp) && point.timestamp > 0;
}

function logRejectedGpsPoint({
  accuracy,
  distanceMeters,
  elapsedTimeMs,
  reason,
  rawSpeedKmh,
}) {
  console.log('[TrackingEngine] GPS point rejected', {
    reason,
    rawSpeedKmh,
    distanceMeters,
    elapsedTimeMs,
    accuracy,
  });
}

function clearPendingSpikePoints({
  logRejected = false,
  reason = 'inconsistent_high_speed_candidate',
} = {}) {
  if (state.pendingSpikePoints.length === 0) {
    return;
  }

  if (logRejected) {
    const rejectedPoint = state.pendingSpikePoints[0];
    const elapsedTimeMs = state.lastGpsPoint
      ? rejectedPoint.timestamp - state.lastGpsPoint.timestamp
      : 0;
    const distanceMeters = state.lastGpsPoint
      ? getDistanceMeters(state.lastGpsPoint, rejectedPoint)
      : 0;

    logRejectedGpsPoint({
      accuracy: rejectedPoint.accuracy,
      distanceMeters,
      elapsedTimeMs,
      reason,
      rawSpeedKmh: rejectedPoint.rawSpeedKmh,
    });
  }

  setState({ pendingSpikePoints: [] });
}

function areSpikePointsConsistent(previousAcceptedPoint, pendingPoints) {
  if (pendingPoints.length < SPIKE_CONFIRMATION_COUNT) {
    return false;
  }

  let previousPoint = previousAcceptedPoint;
  let previousVector = null;

  for (const point of pendingPoints) {
    if (!previousPoint) {
      previousPoint = point;
      continue;
    }

    const elapsedTimeMs = point.timestamp - previousPoint.timestamp;
    const distanceMeters = getDistanceMeters(previousPoint, point);
    const currentVector = {
      latitude: point.latitude - previousPoint.latitude,
      longitude: point.longitude - previousPoint.longitude,
    };

    if (
      elapsedTimeMs < MIN_VALID_POINT_INTERVAL_MS ||
      !Number.isFinite(distanceMeters) ||
      distanceMeters > MAX_JUMP_DISTANCE_METERS
    ) {
      return false;
    }

    if (previousVector) {
      const dotProduct =
        previousVector.latitude * currentVector.latitude +
        previousVector.longitude * currentVector.longitude;

      if (!Number.isFinite(dotProduct) || dotProduct <= 0) {
        return false;
      }
    }

    previousVector = currentVector;
    previousPoint = point;
  }

  return true;
}

function validateGpsPointCandidate(currentPoint, previousAcceptedPoint) {
  const accuracy = currentPoint.accuracy;

  if (!isPointCoordinateUsable(currentPoint)) {
    clearPendingSpikePoints({ logRejected: true });
    return {
      accepted: false,
      shouldLog: true,
      reason: 'invalid_coordinates',
      distanceMeters: 0,
      elapsedTimeMs: 0,
    };
  }

  if (!isPointTimestampUsable(currentPoint)) {
    clearPendingSpikePoints({ logRejected: true });
    return {
      accepted: false,
      shouldLog: true,
      reason: 'invalid_timestamp',
      distanceMeters: 0,
      elapsedTimeMs: 0,
    };
  }

  if (
    Number.isFinite(accuracy) &&
    accuracy > MAX_ACCEPTABLE_ACCURACY_METERS
  ) {
    clearPendingSpikePoints({ logRejected: true });
    return {
      accepted: false,
      shouldLog: true,
      reason: 'poor_accuracy',
      distanceMeters: 0,
      elapsedTimeMs: previousAcceptedPoint
        ? currentPoint.timestamp - previousAcceptedPoint.timestamp
        : 0,
    };
  }

  if (!previousAcceptedPoint) {
    clearPendingSpikePoints({ logRejected: true });
    return {
      accepted: true,
      distanceMeters: 0,
      elapsedTimeMs: 0,
    };
  }

  const elapsedTimeMs = currentPoint.timestamp - previousAcceptedPoint.timestamp;
  const distanceMeters = getDistanceMeters(previousAcceptedPoint, currentPoint);
  const rawSpeedKmh = currentPoint.rawSpeedKmh;

  if (elapsedTimeMs <= 0) {
    clearPendingSpikePoints({ logRejected: true });
    return {
      accepted: false,
      shouldLog: true,
      reason: 'non_increasing_timestamp',
      distanceMeters,
      elapsedTimeMs,
    };
  }

  if (elapsedTimeMs < MIN_VALID_POINT_INTERVAL_MS) {
    clearPendingSpikePoints({ logRejected: true });
    return {
      accepted: false,
      shouldLog: true,
      reason: 'interval_too_short',
      distanceMeters,
      elapsedTimeMs,
    };
  }

  if (
    distanceMeters > MAX_JUMP_DISTANCE_METERS &&
    rawSpeedKmh > SINGLE_POINT_SPIKE_SPEED_KMH
  ) {
    clearPendingSpikePoints({ logRejected: true });
    return {
      accepted: false,
      shouldLog: true,
      reason: 'impossible_jump',
      distanceMeters,
      elapsedTimeMs,
    };
  }

  if (rawSpeedKmh > SINGLE_POINT_SPIKE_SPEED_KMH) {
    const pendingSpikePoints = [...state.pendingSpikePoints, currentPoint];
    const isConfirmed = areSpikePointsConsistent(
      previousAcceptedPoint,
      pendingSpikePoints
    );

    if (!isConfirmed) {
      if (pendingSpikePoints.length >= SPIKE_CONFIRMATION_COUNT) {
        setState({ pendingSpikePoints });
        clearPendingSpikePoints({
          logRejected: true,
          reason: 'inconsistent_high_speed_candidate',
        });
      } else {
        setState({ pendingSpikePoints });
      }

      return {
        accepted: false,
        shouldLog: false,
        reason: 'pending_high_speed_confirmation',
        distanceMeters,
        elapsedTimeMs,
      };
    }

    clearPendingSpikePoints();
    return {
      accepted: true,
      distanceMeters,
      elapsedTimeMs,
      confirmedSpike: true,
    };
  }

  clearPendingSpikePoints({ logRejected: true });
  return {
    accepted: true,
    distanceMeters,
    elapsedTimeMs,
  };
}

export function configureTrackingNotification({
  deviceName,
  isNetworkOnline,
} = {}) {
  let shouldRefresh = false;

  if (typeof deviceName === 'string' && deviceName !== notificationPresentation.deviceName) {
    notificationPresentation.deviceName = deviceName;
    shouldRefresh = true;
  }

  if (
    typeof isNetworkOnline === 'boolean' &&
    isNetworkOnline !== notificationPresentation.isNetworkOnline
  ) {
    notificationPresentation.isNetworkOnline = isNetworkOnline;
    shouldRefresh = true;
  }

  if (shouldRefresh) {
    refreshForegroundNotification({ force: true });
  }
}

function hasMeaningfulMovement(point) {
  if (point.speedKmh > MOVING_SPEED_THRESHOLD_KMH) {
    return true;
  }

  if (state.activeTripId) {
    return false;
  }

  if (!state.lastParkingLocation) {
    return false;
  }

  return (
    getDistanceMeters(state.lastParkingLocation, point) >
    MOVING_DISTANCE_THRESHOLD_METERS
  );
}

function getStoppedDurationMs(timestamp = Date.now()) {
  return calculateStoppedDurationMs(timestamp);
}

function getStoppedMovementStatus(timestamp = Date.now()) {
  const stoppedDurationMs = getStoppedDurationMs(timestamp);

  if (stoppedDurationMs >= PARKING_DURATION_MS) {
    return TRACKING_STATUS.PARKING;
  }

  if (stoppedDurationMs >= TEMPORARY_STOP_DURATION_MS) {
    return TRACKING_STATUS.PAUSED;
  }

  return state.movementStatus;
}

function getParkingTripEndTime() {
  return (
    state.parkingCandidateStartedAt ??
    state.lastMeaningfulMovementAt ??
    Date.now()
  );
}

function startGpsLostTimer() {
  stopGpsLostTimer();

  gpsLostTimer = setTimeout(() => {
    checkGpsHeartbeat().catch(() => {
      if (state.isEnabled) {
        setState({ movementStatus: TRACKING_STATUS.GPS_LOST });
      }
    });
  }, GPS_LOST_TIMEOUT_MS);
}

function stopGpsLostTimer() {
  if (gpsLostTimer) {
    clearTimeout(gpsLostTimer);
    gpsLostTimer = null;
  }
}

async function publishLiveLocation(point, status, activeTripId) {
  await updateLiveLocation(state.uid, state.deviceId, {
    latitude: point.latitude,
    longitude: point.longitude,
    speedKmh: point.speedKmh,
    heading: point.heading ?? null,
    accuracy: point.accuracy ?? null,
    status,
    movementStatus: status,
    stoppedDurationMs: state.stoppedDurationMs ?? 0,
    stoppedSince: state.stoppedSince ?? null,
    activeTripId: activeTripId ?? null,
    activeTripMaxSpeedKmh: state.activeTripMaxSpeedKmh ?? 0,
    todayDistanceKm: state.todayDistanceKm ?? 0,
    recordedAt: point.timestamp ?? Date.now(),
  });
}

async function checkGpsHeartbeat() {
  if (!state.isEnabled) {
    return;
  }

  const health = await GpsEngine.checkLocationHealth();

  if (!health.healthy) {
    resetStoppedDuration();
    setState({ movementStatus: TRACKING_STATUS.GPS_LOST });
    return;
  }

  if (!state.lastGpsPoint) {
    const currentLocation = await GpsEngine.getCurrentLocation();
    await handleLocationUpdate(currentLocation);
    return;
  }

  const nextMovementStatus = state.activeTripId
    ? getStoppedMovementStatus(Date.now())
    : TRACKING_STATUS.PARKING;

  if (nextMovementStatus === TRACKING_STATUS.PARKING && state.activeTripId) {
    await completeActiveTrip(getParkingTripEndTime());
  }

  setState({
    currentSpeedKmh: 0,
    stoppedDurationMs: calculateStoppedDurationMs(Date.now()),
    movementStatus: nextMovementStatus,
  });

  startGpsLostTimer();
}

async function ensureActiveTrip(location) {
  if (state.activeTrip) {
    return state.activeTrip;
  }

  const trip = await createAutoTrip(location);

  setState({
    activeTrip: trip,
    activeTripId: trip.id,
    activeTripMaxSpeedKmh: 0,
    startedAt: trip.startTime,
  });

  return trip;
}

async function completeActiveTrip(endTime = getParkingTripEndTime()) {
  if (!state.activeTripId || state.isCompletingTrip) {
    return null;
  }

  const completingTripId = state.activeTripId;
  setState({ isCompletingTrip: true });

  try {
    const completedTrip = await completeAutoTrip(completingTripId, {
      endTime,
      maxSpeedKmh: state.activeTripMaxSpeedKmh,
    });

    syncCompletedTrip(state.uid, state.deviceId, completedTrip).catch((error) => {
      console.warn('Failed to sync completed trip.', error);
    });

    if (state.activeTripId === completingTripId) {
      setState({
        activeTrip: null,
        activeTripId: null,
        activeTripMaxSpeedKmh: 0,
        startedAt: null,
        parkingCandidateStartedAt: null,
        lastMeaningfulGpsPoint: null,
        isCompletingTrip: false,
      });
    } else {
      setState({ isCompletingTrip: false });
    }

    return completedTrip;
  } catch (error) {
    setState({ isCompletingTrip: false });
    throw error;
  }
}

async function handleLocationUpdate(location) {
  if (!state.isEnabled || !state.deviceId || state.isCompletingTrip) {
    return;
  }

  startGpsLostTimer();

  const pointWithoutSpeed = normalizeLocationToPoint(location);
  const timestamp = pointWithoutSpeed.timestamp;
  const rawSpeedKmh = calculateSpeedKmh(state.lastGpsPoint, pointWithoutSpeed);
  const currentPoint = {
    ...pointWithoutSpeed,
    rawSpeedKmh,
    speedKmh: rawSpeedKmh,
  };

  const validation = validateGpsPointCandidate(currentPoint, state.lastGpsPoint);

  if (!validation.accepted) {
    if (validation.shouldLog) {
      logRejectedGpsPoint({
        accuracy: currentPoint.accuracy,
        distanceMeters: validation.distanceMeters,
        elapsedTimeMs: validation.elapsedTimeMs,
        reason: validation.reason,
        rawSpeedKmh,
      });
    }

    return;
  }

  setState({ lastGpsAt: currentPoint.timestamp });

  if (!state.lastParkingLocation) {
    setState({ lastParkingLocation: currentPoint });
  }

  if (!state.lastGpsPoint) {
    setState({
      lastMeaningfulMovementAt: timestamp,
      lastMeaningfulGpsPoint: currentPoint,
    });
  }

  const isMoving = hasMeaningfulMovement(currentPoint);

  if (isMoving) {
    resetStoppedDuration();
    setState({ parkingCandidateStartedAt: null });
  } else if (state.activeTripId) {
    const distanceFromLastMeaningfulPoint = state.lastMeaningfulGpsPoint
      ? getDistanceMeters(state.lastMeaningfulGpsPoint, currentPoint)
      : 0;

    if (
      !state.parkingCandidateStartedAt ||
      distanceFromLastMeaningfulPoint > PARKING_RADIUS_METERS
    ) {
      setState({ parkingCandidateStartedAt: timestamp });
      beginStoppedDuration(timestamp);
    } else {
      beginStoppedDuration(timestamp);
    }
  }

  let nextMovementStatus = state.movementStatus;
  let savedPoint = null;
  const stoppedMovementStatus = getStoppedMovementStatus(timestamp);
  const shouldStoreTripPoint =
    isMoving ||
    (state.activeTripId && stoppedMovementStatus !== TRACKING_STATUS.PARKING);

  if (shouldStoreTripPoint) {
    const trip = await ensureActiveTrip(currentPoint);
    savedPoint = await addLocationToTrip(
      trip,
      currentPoint,
      state.lastGpsPoint
    );
    const activeTripMaxSpeedKmh = isMoving
      ? Math.max(
          state.activeTripMaxSpeedKmh,
          savedPoint.speedKmh ?? currentPoint.speedKmh
        )
      : state.activeTripMaxSpeedKmh;
    const previousTripDistanceKm = Number(state.activeTrip?.totalDistanceKm) || 0;
    const nextTripDistanceKm = Number(savedPoint.trip?.totalDistanceKm) || 0;
    const pointDateKey = getTodayDateKey(timestamp);
    const todayDistanceKm = state.todayDateKey === pointDateKey
      ? Math.max(
          0,
          state.todayDistanceKm + nextTripDistanceKm - previousTripDistanceKm
        )
      : await getTodayDistanceKm(timestamp);
    nextMovementStatus = isMoving
      ? TRACKING_STATUS.MOVING
      : stoppedMovementStatus;

    setState({
      activeTrip: {
        ...trip,
        ...savedPoint.trip,
        endTime: savedPoint.timestamp,
        maxSpeedKmh: activeTripMaxSpeedKmh,
      },
      activeTripMaxSpeedKmh,
      todayDistanceKm,
      todayDateKey: pointDateKey,
      lastMeaningfulMovementAt: isMoving
        ? timestamp
        : state.lastMeaningfulMovementAt,
      lastMeaningfulGpsPoint: isMoving
        ? currentPoint
        : state.lastMeaningfulGpsPoint,
    });
  } else if (stoppedMovementStatus === TRACKING_STATUS.PARKING) {
    nextMovementStatus = TRACKING_STATUS.PARKING;
    setState({
      activeTripMaxSpeedKmh: state.activeTripId
        ? state.activeTripMaxSpeedKmh
        : 0,
      lastParkingLocation: currentPoint,
    });

    if (state.activeTripId) {
      await completeActiveTrip(getParkingTripEndTime());
    }
  } else {
    nextMovementStatus = state.activeTripId
      ? stoppedMovementStatus
      : TRACKING_STATUS.PARKING;

    if (!state.activeTripId) {
      setState({ activeTripMaxSpeedKmh: 0 });
    }
  }

  setState({
    currentSpeedKmh: isMoving ? currentPoint.speedKmh : 0,
    movementStatus: nextMovementStatus,
    lastGpsPoint: currentPoint,
  });

  try {
    const liveLocationPoint = {
      ...currentPoint,
      speedKmh: isMoving ? currentPoint.speedKmh : 0,
    };

    await publishLiveLocation(
      liveLocationPoint,
      nextMovementStatus,
      state.activeTripId
    );
    setState({ connectionStatus: CONNECTION_STATUS.ONLINE });
  } catch (error) {
    setState({ connectionStatus: CONNECTION_STATUS.OFFLINE });
  }
}

export async function initialize({ uid, deviceId }, reason = 'context ready') {
  console.log(
    `[TrackingEngine] initialize reason: ${reason}, uid: ${uid ?? 'missing'}, deviceId: ${deviceId ?? 'missing'}`
  );

  if (!uid || !deviceId) {
    if (state.isEnabled) {
      await disableTracking('initialize called without complete context');
    }

    stopStoppedDurationTimer();
    setState({
      uid: uid ?? null,
      deviceId: deviceId ?? null,
      isInitialized: false,
      isEnabled: false,
      movementStatus: TRACKING_STATUS.IDLE,
      connectionStatus: CONNECTION_STATUS.ONLINE,
      todayDistanceKm: 0,
      todayDateKey: null,
      stoppedDurationMs: 0,
      stoppedSince: null,
      pendingSpikePoints: [],
      parkingCandidateStartedAt: null,
      lastMeaningfulGpsPoint: null,
      isCompletingTrip: false,
    });
    return getState();
  }

  if (isSameTrackingContext(uid, deviceId)) {
    return getState();
  }

  if (state.isEnabled) {
    await disableTracking('tracking context changed');
  }

  const initializationTime = Date.now();
  const todayDistanceKm = await getTodayDistanceKm(initializationTime);

  setState({
    uid,
    deviceId,
    isInitialized: true,
    movementStatus: TRACKING_STATUS.IDLE,
    connectionStatus: CONNECTION_STATUS.ONLINE,
    activeTripId: null,
    activeTrip: null,
    startedAt: null,
    currentSpeedKmh: 0,
    activeTripMaxSpeedKmh: 0,
    todayDistanceKm,
    todayDateKey: getTodayDateKey(initializationTime),
    stoppedDurationMs: 0,
    stoppedSince: null,
    lastGpsPoint: null,
    lastParkingLocation: null,
    lastMeaningfulMovementAt: null,
    parkingCandidateStartedAt: null,
    lastMeaningfulGpsPoint: null,
    lastGpsAt: null,
    pendingSpikePoints: [],
    isCompletingTrip: false,
  });

  return getState();
}

export async function enableTracking(reason = 'auto tracking enabled') {
  if (!state.uid || !state.deviceId) {
    setState({ movementStatus: TRACKING_STATUS.IDLE });
    return getState();
  }

  if (state.isEnabled) {
    return getState();
  }

  logLifecycle('enable', reason);

  const currentDateKey = getTodayDateKey();
  if (state.todayDateKey !== currentDateKey) {
    setState({
      todayDateKey: currentDateKey,
      todayDistanceKm: await getTodayDistanceKm(),
    });
  }

  if (unsubscribeFromGps) {
    unsubscribeFromGps();
    unsubscribeFromGps = null;
  }

  setState({
    isEnabled: true,
    movementStatus: TRACKING_STATUS.PARKING,
    stoppedDurationMs: 0,
    stoppedSince: null,
  });

  unsubscribeFromGps = GpsEngine.subscribe((location) => {
    handleLocationUpdate(location).catch(() => {
      resetStoppedDuration();
      setState({ movementStatus: TRACKING_STATUS.GPS_LOST });
    });
  });

  try {
    const watchOptions = {
      timeInterval: DEFAULT_GPS_INTERVAL_MS,
    };
    const foregroundContent = getNotificationContent();
    const foregroundService =
      buildForegroundServiceOptions(foregroundContent);
    rememberNotificationLocationOptions(watchOptions);
    resetLiveTrackingNotificationCache();

    await GpsEngine.startWatching({
      ...watchOptions,
      foregroundService,
    });
    startGpsLostTimer();
    if (GpsEngine.getForegroundServiceStatus()) {
      rememberVisibleLiveTrackingNotification(foregroundContent);
    }
  } catch (error) {
    if (unsubscribeFromGps) {
      unsubscribeFromGps();
      unsubscribeFromGps = null;
    }

    setState({
      isEnabled: false,
      movementStatus: TRACKING_STATUS.GPS_LOST,
      stoppedDurationMs: 0,
      stoppedSince: null,
    });
    throw error;
  }

  return getState();
}

export async function disableTracking(reason = 'explicit user action') {
  if (isDisablingTracking) {
    return getState();
  }

  isDisablingTracking = true;
  logLifecycle('disable', reason);

  try {
    await GpsEngine.stopWatching();
    resetLiveTrackingNotificationCache();
    stopGpsLostTimer();
    stopStoppedDurationTimer();

    if (unsubscribeFromGps) {
      unsubscribeFromGps();
      unsubscribeFromGps = null;
    }

    if (state.activeTripId) {
      await interruptAutoTrip(state.activeTripId, {
        maxSpeedKmh: state.activeTripMaxSpeedKmh,
      });
    }

    setState({
      isEnabled: false,
      movementStatus: TRACKING_STATUS.IDLE,
      connectionStatus: CONNECTION_STATUS.ONLINE,
      activeTripId: null,
      activeTrip: null,
      startedAt: null,
      currentSpeedKmh: 0,
      activeTripMaxSpeedKmh: 0,
      stoppedDurationMs: 0,
      stoppedSince: null,
      lastGpsPoint: null,
      lastMeaningfulMovementAt: null,
      parkingCandidateStartedAt: null,
      lastMeaningfulGpsPoint: null,
      pendingSpikePoints: [],
      isCompletingTrip: false,
    });

    return getState();
  } finally {
    isDisablingTracking = false;
  }
}

export async function shutdown(reason = 'provider unmounted') {
  logLifecycle('shutdown', reason);
  await disableTracking(`shutdown: ${reason}`);

  setState({
    uid: null,
    deviceId: null,
    isInitialized: false,
    connectionStatus: CONNECTION_STATUS.ONLINE,
    currentSpeedKmh: 0,
    activeTripMaxSpeedKmh: 0,
    todayDistanceKm: 0,
    todayDateKey: null,
    stoppedDurationMs: 0,
    stoppedSince: null,
    lastGpsPoint: null,
    lastParkingLocation: null,
    lastMeaningfulMovementAt: null,
    parkingCandidateStartedAt: null,
    lastMeaningfulGpsPoint: null,
    lastGpsAt: null,
    pendingSpikePoints: [],
    isCompletingTrip: false,
  });

  return getState();
}

export function subscribeToState(callback) {
  listeners.add(callback);

  return () => {
    listeners.delete(callback);
  };
}

export function getState() {
  return getPublicState();
}
