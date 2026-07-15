import { MIN_VALID_POINT_INTERVAL_MS } from '../../constants/tracking';
import { normalizeLocationToPoint } from '../../utils/geo';
import { evaluateGpsQuality } from './gpsQualityFilter';
import { evaluateMotionSample } from './motionDetectionEngine';
import { resolveLocationSpeed } from './speedProcessor';

function isDevelopmentBuild() {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function logMotionSample(stage, details = {}) {
  if (!isDevelopmentBuild()) {
    return;
  }

  console.log(`[MOTION_DETECTION] ${stage}`, details);
}

export function processMotionSample({
  location,
  motionState,
  previousAcceptedPoint,
  recentSpeedSamplesKmh = [],
}) {
  const pointWithoutSpeed = normalizeLocationToPoint(location);

  logMotionSample('RAW', {
    accuracy: pointWithoutSpeed.accuracy ?? null,
    hasHeading: Number.isFinite(pointWithoutSpeed.heading),
    hasNativeSpeed:
      Number.isFinite(location?.coords?.speed) && location.coords.speed >= 0,
    timestamp: pointWithoutSpeed.timestamp ?? null,
  });

  const quality = evaluateGpsQuality(pointWithoutSpeed, location);
  if (!quality.accepted) {
    logMotionSample('REJECTED', {
      reason: quality.reason,
      timestamp: pointWithoutSpeed.timestamp ?? null,
    });
    return {
      accepted: false,
      currentPoint: pointWithoutSpeed,
      nextMotionState: motionState,
      nextSpeedSamplesKmh: recentSpeedSamplesKmh,
      qualityScore: quality.qualityScore,
      reason: quality.reason,
      shouldAdvanceStationaryState: false,
      shouldPublishHeartbeat: false,
    };
  }

  if (previousAcceptedPoint) {
    const elapsedTimeMs =
      pointWithoutSpeed.timestamp - previousAcceptedPoint.timestamp;
    if (elapsedTimeMs <= 0) {
      logMotionSample('REJECTED', {
        reason: 'timestamp_invalid',
        timestamp: pointWithoutSpeed.timestamp,
      });
      return {
        accepted: false,
        currentPoint: pointWithoutSpeed,
        nextMotionState: motionState,
        nextSpeedSamplesKmh: recentSpeedSamplesKmh,
        qualityScore: quality.qualityScore,
        reason: 'timestamp_invalid',
        shouldAdvanceStationaryState: false,
        shouldPublishHeartbeat: false,
      };
    }

    if (elapsedTimeMs < MIN_VALID_POINT_INTERVAL_MS) {
      logMotionSample('REJECTED', {
        reason: 'timestamp_invalid',
        timestamp: pointWithoutSpeed.timestamp,
      });
      return {
        accepted: false,
        currentPoint: pointWithoutSpeed,
        nextMotionState: motionState,
        nextSpeedSamplesKmh: recentSpeedSamplesKmh,
        qualityScore: quality.qualityScore,
        reason: 'timestamp_invalid',
        shouldAdvanceStationaryState: false,
        shouldPublishHeartbeat: false,
      };
    }
  }

  const speedResult = resolveLocationSpeed({
    currentPoint: pointWithoutSpeed,
    location,
    previousPoint: previousAcceptedPoint,
    recentSpeedSamplesKmh,
  });
  if (!speedResult.accepted) {
    logMotionSample('REJECTED', {
      reason: speedResult.reason,
      timestamp: pointWithoutSpeed.timestamp,
    });
    return {
      accepted: false,
      currentPoint: pointWithoutSpeed,
      nextMotionState: motionState,
      nextSpeedSamplesKmh: recentSpeedSamplesKmh,
      qualityScore: quality.qualityScore,
      reason: speedResult.reason,
      shouldAdvanceStationaryState: false,
      shouldPublishHeartbeat: false,
      speedResult,
    };
  }

  const currentPoint = {
    ...pointWithoutSpeed,
    nativeSpeedKmh: speedResult.nativeSpeedKmh,
    rawSpeedKmh: speedResult.rawSpeedKmh,
    speedKmh: speedResult.speedKmh,
    speedSource: speedResult.source,
  };
  const motion = evaluateMotionSample({
    currentPoint,
    motionState,
    nativeSpeedKmh: speedResult.nativeSpeedKmh,
    previousAcceptedPoint,
    qualityScore: quality.qualityScore,
    speedKmh: speedResult.speedKmh,
  });

  if (!motion.accepted) {
    logMotionSample('REJECTED', {
      confidence: motion.movementConfidence ?? 0,
      reason: motion.reason,
      timestamp: currentPoint.timestamp,
    });
  } else {
    logMotionSample('ACCEPTED', {
      confidence: motion.movementConfidence ?? 0,
      isMoving: motion.isMoving,
      qualityScore: quality.qualityScore,
      speedKmh: Number(currentPoint.speedKmh.toFixed(1)),
      speedSource: currentPoint.speedSource,
      timestamp: currentPoint.timestamp,
    });
  }

  return {
    ...motion,
    currentPoint,
    nextMotionState: motion.nextState,
    nextSpeedSamplesKmh: speedResult.nextSpeedSamplesKmh,
    qualityScore: quality.qualityScore,
    speedResult,
  };
}
