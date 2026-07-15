import { calculateSpeedKmh } from '../../utils/geo';

const METERS_PER_SECOND_TO_KMH = 3.6;
const MAX_NATIVE_SPEED_KMH = 400;
const MAX_FALLBACK_SPEED_KMH = 320;
const MAX_FALLBACK_ACCELERATION_KMH_PER_SECOND = 45;
const MAX_SPEED_SAMPLE_COUNT = 3;
const MIN_DIVERGENCE_KMH = 45;
const MAX_NATIVE_FALLBACK_RATIO = 1.8;

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
  return nativeSpeedKmh <= MAX_NATIVE_SPEED_KMH ? nativeSpeedKmh : null;
}

function getElapsedSeconds(previousPoint, currentPoint) {
  const elapsedTimeMs = currentPoint.timestamp - previousPoint.timestamp;
  return Number.isFinite(elapsedTimeMs) && elapsedTimeMs > 0
    ? elapsedTimeMs / 1000
    : null;
}

function hasImplausibleFallbackAcceleration({
  elapsedSeconds,
  fallbackSpeedKmh,
  previousSpeedKmh,
}) {
  if (
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds > 5 ||
    !Number.isFinite(previousSpeedKmh) ||
    previousSpeedKmh <= 5
  ) {
    return false;
  }

  const accelerationKmhPerSecond =
    Math.abs(fallbackSpeedKmh - previousSpeedKmh) / elapsedSeconds;
  return accelerationKmhPerSecond > MAX_FALLBACK_ACCELERATION_KMH_PER_SECOND;
}

function hasNativeFallbackDivergence(nativeSpeedKmh, fallbackSpeedKmh) {
  if (!Number.isFinite(nativeSpeedKmh) || !Number.isFinite(fallbackSpeedKmh)) {
    return false;
  }

  const differenceKmh = fallbackSpeedKmh - nativeSpeedKmh;
  const ratio = fallbackSpeedKmh / Math.max(1, nativeSpeedKmh);

  return (
    differenceKmh > MIN_DIVERGENCE_KMH &&
    ratio > MAX_NATIVE_FALLBACK_RATIO
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

  const coordinateSpeedKmh = calculateSpeedKmh(previousPoint, currentPoint);
  const elapsedSeconds = getElapsedSeconds(previousPoint, currentPoint);
  const elapsedTimeMs = currentPoint.timestamp - previousPoint.timestamp;

  if (
    nativeSpeedKmh == null &&
    coordinateSpeedKmh > MAX_FALLBACK_SPEED_KMH
  ) {
    return {
      accepted: false,
      coordinateSpeedKmh,
      elapsedTimeMs,
      nativeSpeedKmh,
      nativeSpeedMetersPerSecond,
      reason: 'implausible_fallback_speed',
    };
  }

  if (
    nativeSpeedKmh == null &&
    hasImplausibleFallbackAcceleration({
      elapsedSeconds,
      fallbackSpeedKmh: coordinateSpeedKmh,
      previousSpeedKmh: previousPoint.speedKmh,
    })
  ) {
    return {
      accepted: false,
      coordinateSpeedKmh,
      elapsedTimeMs,
      nativeSpeedKmh,
      nativeSpeedMetersPerSecond,
      reason: 'implausible_fallback_acceleration',
    };
  }

  if (
    Number.isFinite(elapsedSeconds) &&
    elapsedSeconds <= 5 &&
    hasNativeFallbackDivergence(nativeSpeedKmh, coordinateSpeedKmh)
  ) {
    return {
      accepted: false,
      coordinateSpeedKmh,
      elapsedTimeMs,
      nativeSpeedKmh,
      nativeSpeedMetersPerSecond,
      reason: 'native_coordinate_speed_divergence',
    };
  }

  const source = nativeSpeedKmh == null ? 'coordinate_fallback' : 'native_gnss';
  const rawSpeedKmh = nativeSpeedKmh ?? coordinateSpeedKmh;
  const nextSpeedSamplesKmh = [
    ...recentSpeedSamplesKmh.filter(
      (speedKmh) => Number.isFinite(speedKmh) && speedKmh >= 0
    ),
    rawSpeedKmh,
  ].slice(-MAX_SPEED_SAMPLE_COUNT);

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
