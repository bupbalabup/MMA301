import { MOTION_DETECTION_CONFIG } from '../../constants/tracking';
import { calculateDistanceKm } from '../../utils/geo';

const METERS_PER_KILOMETER = 1000;

function getDistanceMeters(pointA, pointB) {
  if (!pointA || !pointB) {
    return 0;
  }

  return calculateDistanceKm(pointA, pointB) * METERS_PER_KILOMETER;
}

function getHeadingDelta(headingA, headingB) {
  if (!Number.isFinite(headingA) || !Number.isFinite(headingB)) {
    return null;
  }

  const rawDelta = Math.abs(headingA - headingB) % 360;
  return Math.min(rawDelta, 360 - rawDelta);
}

function getMotionConfidence({
  candidateCount,
  candidateDurationMs,
  distanceFromStationaryCenter,
  headingDelta,
  qualityScore,
  speedKmh,
}) {
  const qualityContribution = Math.min(35, qualityScore * 0.35);
  const speedContribution = Math.min(
    25,
    Math.max(0, ((speedKmh - MOTION_DETECTION_CONFIG.stationarySpeedKmh) / 18) * 25)
  );
  const distanceContribution = Math.min(
    20,
    (distanceFromStationaryCenter /
      MOTION_DETECTION_CONFIG.movementDistanceMeters) *
      20
  );
  const consecutiveContribution = Math.min(
    15,
    (candidateCount / MOTION_DETECTION_CONFIG.requiredMovingSamples) * 15
  );
  const durationContribution = Math.min(5, candidateDurationMs / 1000);
  const headingMultiplier =
    headingDelta == null ||
    headingDelta <= MOTION_DETECTION_CONFIG.headingConsistencyDegrees
      ? 1
      : 0.8;

  return Math.round(
    Math.min(
      100,
      (qualityContribution +
        speedContribution +
        distanceContribution +
        consecutiveContribution +
        durationContribution) *
        headingMultiplier
    )
  );
}

function getDefaultState() {
  return {
    candidateLastPoint: null,
    lastAcceptedHeading: null,
    lastStationaryHeartbeatAt: null,
    mode: 'stationary',
    movementCandidateCount: 0,
    movementCandidateStartedAt: null,
    movementConfidence: 0,
    stationaryCenter: null,
  };
}

export function createMotionDetectionState(value = {}) {
  return {
    ...getDefaultState(),
    ...(value && typeof value === 'object' ? value : {}),
  };
}

function resetCandidate(state, updates = {}) {
  return {
    ...state,
    candidateLastPoint: null,
    movementCandidateCount: 0,
    movementCandidateStartedAt: null,
    movementConfidence: 0,
    ...updates,
  };
}

function isCoordinateJumpImplausible({
  currentPoint,
  nativeSpeedKmh,
  previousAcceptedPoint,
}) {
  if (!previousAcceptedPoint || !Number.isFinite(nativeSpeedKmh)) {
    return false;
  }

  const elapsedSeconds =
    (currentPoint.timestamp - previousAcceptedPoint.timestamp) / 1000;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return false;
  }

  const distanceMeters = getDistanceMeters(previousAcceptedPoint, currentPoint);
  const expectedDistanceMeters =
    (nativeSpeedKmh / 3.6) * elapsedSeconds;
  const accuracyAllowance =
    Math.max(0, Number(currentPoint.accuracy) || 0) * 2;
  const allowedDistanceMeters = Math.max(
    100,
    expectedDistanceMeters * 3 + accuracyAllowance + 25
  );

  return distanceMeters > allowedDistanceMeters;
}

export function evaluateMotionSample({
  currentPoint,
  motionState,
  nativeSpeedKmh,
  previousAcceptedPoint,
  qualityScore,
  speedKmh,
}) {
  const state = createMotionDetectionState(motionState);
  const timestamp = currentPoint.timestamp;
  const stationaryCenter = state.stationaryCenter ?? currentPoint;
  const distanceFromStationaryCenter = getDistanceMeters(
    stationaryCenter,
    currentPoint
  );
  const distanceFromPreviousPoint = getDistanceMeters(
    previousAcceptedPoint,
    currentPoint
  );
  const referenceHeading =
    state.candidateLastPoint?.heading ?? state.lastAcceptedHeading;
  const headingDelta = getHeadingDelta(referenceHeading, currentPoint.heading);
  const isStationarySpeed =
    speedKmh < MOTION_DETECTION_CONFIG.stationarySpeedKmh;

  if (!previousAcceptedPoint && !state.stationaryCenter) {
    return {
      accepted: true,
      distanceFromPreviousPoint: 0,
      distanceFromStationaryCenter: 0,
      isMoving: false,
      movementConfidence: 0,
      nextState: resetCandidate(state, {
        lastAcceptedHeading: Number.isFinite(currentPoint.heading)
          ? currentPoint.heading
          : null,
        lastStationaryHeartbeatAt: timestamp,
        mode: 'stationary',
        stationaryCenter: currentPoint,
      }),
      shouldPersistPoint: false,
      shouldPublishHeartbeat: false,
    };
  }

  if (
    isCoordinateJumpImplausible({
      currentPoint,
      nativeSpeedKmh,
      previousAcceptedPoint,
    })
  ) {
    return {
      accepted: false,
      distanceFromPreviousPoint,
      distanceFromStationaryCenter,
      nextState: state,
      reason: 'speed_spike',
      shouldAdvanceStationaryState: false,
      shouldPublishHeartbeat: false,
    };
  }

  if (
    isStationarySpeed &&
    headingDelta != null &&
    headingDelta >= MOTION_DETECTION_CONFIG.headingNoiseDegrees &&
    distanceFromStationaryCenter <=
      MOTION_DETECTION_CONFIG.stationaryRadiusMeters
  ) {
    const shouldPublishHeartbeat =
      !state.lastStationaryHeartbeatAt ||
      timestamp - state.lastStationaryHeartbeatAt >=
        MOTION_DETECTION_CONFIG.stationaryHeartbeatMs;

    return {
      accepted: false,
      distanceFromPreviousPoint,
      distanceFromStationaryCenter,
      isMoving: false,
      nextState: resetCandidate(state, {
        lastStationaryHeartbeatAt: shouldPublishHeartbeat
          ? timestamp
          : state.lastStationaryHeartbeatAt,
        mode: 'stationary',
        stationaryCenter,
      }),
      reason: 'heading_noise',
      shouldAdvanceStationaryState: true,
      shouldPublishHeartbeat,
    };
  }

  if (
    isStationarySpeed &&
    state.stationaryCenter &&
    distanceFromStationaryCenter <=
      MOTION_DETECTION_CONFIG.stationaryRadiusMeters
  ) {
    const shouldPublishHeartbeat =
      !state.lastStationaryHeartbeatAt ||
      timestamp - state.lastStationaryHeartbeatAt >=
        MOTION_DETECTION_CONFIG.stationaryHeartbeatMs;

    return {
      accepted: false,
      distanceFromPreviousPoint,
      distanceFromStationaryCenter,
      isMoving: false,
      nextState: resetCandidate(state, {
        lastStationaryHeartbeatAt: shouldPublishHeartbeat
          ? timestamp
          : state.lastStationaryHeartbeatAt,
        mode: 'stationary',
        stationaryCenter: state.stationaryCenter,
      }),
      reason: 'gps_drift',
      shouldAdvanceStationaryState: true,
      shouldPublishHeartbeat,
    };
  }

  if (state.mode === 'moving') {
    if (speedKmh > MOTION_DETECTION_CONFIG.movementSpeedKmh) {
      return {
        accepted: true,
        distanceFromPreviousPoint,
        distanceFromStationaryCenter,
        isMoving: true,
        movementConfidence: 100,
        nextState: resetCandidate(state, {
          lastAcceptedHeading: Number.isFinite(currentPoint.heading)
            ? currentPoint.heading
            : state.lastAcceptedHeading,
          lastStationaryHeartbeatAt: null,
          mode: 'moving',
          stationaryCenter: null,
        }),
        shouldPersistPoint: true,
        shouldPublishHeartbeat: false,
      };
    }

    return {
      accepted: true,
      distanceFromPreviousPoint,
      distanceFromStationaryCenter: 0,
      isMoving: false,
      movementConfidence: 0,
      nextState: resetCandidate(state, {
        lastAcceptedHeading: Number.isFinite(currentPoint.heading)
          ? currentPoint.heading
          : state.lastAcceptedHeading,
        lastStationaryHeartbeatAt: timestamp,
        mode: 'stationary',
        stationaryCenter: currentPoint,
      }),
      shouldPersistPoint:
        distanceFromPreviousPoint >=
        MOTION_DETECTION_CONFIG.minDistanceIncrementMeters,
      shouldPublishHeartbeat: false,
    };
  }

  const hasMovingSpeed =
    speedKmh > MOTION_DETECTION_CONFIG.movementSpeedKmh;
  if (!hasMovingSpeed) {
    const shouldPublishHeartbeat =
      !state.lastStationaryHeartbeatAt ||
      timestamp - state.lastStationaryHeartbeatAt >=
        MOTION_DETECTION_CONFIG.stationaryHeartbeatMs;

    return {
      accepted: false,
      distanceFromPreviousPoint,
      distanceFromStationaryCenter,
      isMoving: false,
      nextState: resetCandidate(state, {
        lastStationaryHeartbeatAt: shouldPublishHeartbeat
          ? timestamp
          : state.lastStationaryHeartbeatAt,
        mode: 'stationary',
        stationaryCenter,
      }),
      reason: 'confidence_low',
      shouldAdvanceStationaryState: true,
      shouldPublishHeartbeat,
    };
  }

  const movementCandidateCount = state.movementCandidateCount + 1;
  const movementCandidateStartedAt =
    state.movementCandidateStartedAt ?? timestamp;
  const candidateDurationMs = Math.max(
    0,
    timestamp - movementCandidateStartedAt
  );
  const movementConfidence = getMotionConfidence({
    candidateCount: movementCandidateCount,
    candidateDurationMs,
    distanceFromStationaryCenter,
    headingDelta,
    qualityScore,
    speedKmh,
  });
  const hasEnoughSamples =
    movementCandidateCount >=
    MOTION_DETECTION_CONFIG.requiredMovingSamples;
  const hasEnoughDistance =
    distanceFromStationaryCenter >
    MOTION_DETECTION_CONFIG.movementDistanceMeters;
  const hasEnoughConfidence =
    movementConfidence >=
    MOTION_DETECTION_CONFIG.movementConfidenceThreshold;

  if (hasEnoughSamples && hasEnoughDistance && hasEnoughConfidence) {
    return {
      accepted: true,
      distanceFromPreviousPoint,
      distanceFromStationaryCenter,
      isMoving: true,
      movementConfidence,
      nextState: resetCandidate(state, {
        lastAcceptedHeading: Number.isFinite(currentPoint.heading)
          ? currentPoint.heading
          : state.lastAcceptedHeading,
        lastStationaryHeartbeatAt: null,
        mode: 'moving',
        stationaryCenter: null,
      }),
      shouldPersistPoint: true,
      shouldPublishHeartbeat: false,
    };
  }

  return {
    accepted: false,
    distanceFromPreviousPoint,
    distanceFromStationaryCenter,
    isMoving: false,
    movementConfidence,
    nextState: {
      ...state,
      candidateLastPoint: currentPoint,
      movementCandidateCount,
      movementCandidateStartedAt,
      movementConfidence,
      stationaryCenter,
    },
    reason: 'confidence_low',
    shouldAdvanceStationaryState: false,
    shouldPublishHeartbeat: false,
  };
}
