import { calculateSpeedKmh } from '../../utils/geo';
import { MOTION_DETECTION_CONFIG } from '../../constants/tracking';

const METERS_PER_SECOND_TO_KMH = 3.6;

function getMedian(values) {
  const sortedValues = [...values].sort((valueA, valueB) => valueA - valueB);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex];
  }

  return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
}

function getNativeSpeedMetersPerSecond(location) {
  const nativeSpeedMetersPerSecond = location?.coords?.speed;

  if (
    !Number.isFinite(nativeSpeedMetersPerSecond) ||
    nativeSpeedMetersPerSecond < 0
  ) {
    return null;
  }

  return nativeSpeedMetersPerSecond;
}

function getNativeSpeedKmh(nativeSpeedMetersPerSecond) {
  if (!Number.isFinite(nativeSpeedMetersPerSecond)) {
    return null;
  }

  const nativeSpeedKmh = nativeSpeedMetersPerSecond * METERS_PER_SECOND_TO_KMH;
  return nativeSpeedKmh <= MOTION_DETECTION_CONFIG.maxNativeSpeedKmh
    ? nativeSpeedKmh
    : null;
}

function getElapsedSeconds(previousPoint, currentPoint) {
  const elapsedTimeMs = currentPoint.timestamp - previousPoint.timestamp;
  return Number.isFinite(elapsedTimeMs) && elapsedTimeMs > 0
    ? elapsedTimeMs / 1000
    : null;
}

function hasImplausibleAcceleration({
  elapsedSeconds,
  speedKmh,
  previousSpeedKmh,
}) {
  if (
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds > MOTION_DETECTION_CONFIG.accelerationWindowMs / 1000 ||
    !Number.isFinite(previousSpeedKmh)
  ) {
    return false;
  }

  const accelerationKmhPerSecond =
    Math.abs(speedKmh - previousSpeedKmh) / elapsedSeconds;
  return (
    accelerationKmhPerSecond >
    MOTION_DETECTION_CONFIG.maxAccelerationKmhPerSecond
  );
}

/**
 * Resolves one canonical speed for foreground and background processing.
 * Expo reports coords.speed in m/s; Haversine is a fallback when it is absent.
 */
export function resolveLocationSpeed({
  currentPoint,
  location,
  previousPoint,
  recentSpeedSamplesKmh = [],
}) {
  const nativeSpeedMetersPerSecond = getNativeSpeedMetersPerSecond(location);
  const nativeSpeedKmh = getNativeSpeedKmh(nativeSpeedMetersPerSecond);

  if (!previousPoint) {
    const initialSpeedKmh = nativeSpeedKmh ?? 0;

    return {
      accepted: true,
      coordinateSpeedKmh: 0,
      elapsedTimeMs: null,
      nativeSpeedKmh,
      nativeSpeedMetersPerSecond,
      nextSpeedSamplesKmh: nativeSpeedKmh == null ? [] : [nativeSpeedKmh],
      rawSpeedKmh: initialSpeedKmh,
      source: nativeSpeedKmh == null ? 'initial' : 'native_gnss',
      speedKmh: initialSpeedKmh,
    };
  }

  const elapsedSeconds = getElapsedSeconds(previousPoint, currentPoint);
  const elapsedTimeMs = currentPoint.timestamp - previousPoint.timestamp;
  const coordinateSpeedKmh =
    nativeSpeedKmh == null
      ? calculateSpeedKmh(previousPoint, currentPoint)
      : null;
  const rawSpeedKmh = nativeSpeedKmh ?? coordinateSpeedKmh;

  if (
    nativeSpeedKmh == null &&
    coordinateSpeedKmh > MOTION_DETECTION_CONFIG.maxFallbackSpeedKmh
  ) {
    return {
      accepted: false,
      coordinateSpeedKmh,
      elapsedTimeMs,
      nativeSpeedKmh,
      nativeSpeedMetersPerSecond,
      reason: 'speed_spike',
    };
  }

  if (
    hasImplausibleAcceleration({
      elapsedSeconds,
      speedKmh: rawSpeedKmh,
      previousSpeedKmh: previousPoint.speedKmh,
    })
  ) {
    return {
      accepted: false,
      coordinateSpeedKmh,
      elapsedTimeMs,
      nativeSpeedKmh,
      nativeSpeedMetersPerSecond,
      reason: 'speed_spike',
    };
  }

  const source = nativeSpeedKmh == null ? 'coordinate_fallback' : 'native_gnss';
  const nextSpeedSamplesKmh = [
    ...recentSpeedSamplesKmh.filter(
      (speedKmh) => Number.isFinite(speedKmh) && speedKmh >= 0
    ),
    rawSpeedKmh,
  ].slice(-MOTION_DETECTION_CONFIG.speedMedianSampleCount);

  return {
    accepted: true,
    coordinateSpeedKmh,
    elapsedTimeMs,
    nativeSpeedKmh,
    nativeSpeedMetersPerSecond,
    nextSpeedSamplesKmh,
    rawSpeedKmh,
    source,
    speedKmh: getMedian(nextSpeedSamplesKmh),
  };
}
