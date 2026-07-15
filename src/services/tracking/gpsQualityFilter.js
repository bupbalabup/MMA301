import { MOTION_DETECTION_CONFIG } from '../../constants/tracking';

function isCoordinateValid(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function isHeadingValid(heading) {
  return Number.isFinite(heading) && heading >= 0 && heading <= 360;
}

function getAccuracyScore(accuracy) {
  if (!Number.isFinite(accuracy) || accuracy < 0) {
    return 20;
  }

  if (accuracy <= 10) {
    return 55;
  }

  if (accuracy <= 20) {
    return 45;
  }

  return 35;
}

export function evaluateGpsQuality(point, location, now = Date.now()) {
  const accuracy = point?.accuracy;
  const heading = point?.heading;
  const nativeSpeed = location?.coords?.speed;
  const timestamp = point?.timestamp;

  if (!isCoordinateValid(point?.latitude, point?.longitude)) {
    return { accepted: false, qualityScore: 0, reason: 'invalid_coordinates' };
  }

  if (
    !Number.isFinite(timestamp) ||
    timestamp <= 0 ||
    timestamp > now + MOTION_DETECTION_CONFIG.maxFutureTimestampSkewMs
  ) {
    return { accepted: false, qualityScore: 0, reason: 'timestamp_invalid' };
  }

  if (
    Number.isFinite(accuracy) &&
    accuracy > MOTION_DETECTION_CONFIG.maxAccuracyMeters
  ) {
    return { accepted: false, qualityScore: 0, reason: 'poor_accuracy' };
  }

  const hasNativeSpeed = Number.isFinite(nativeSpeed) && nativeSpeed >= 0;
  const qualityScore = Math.min(
    100,
    getAccuracyScore(accuracy) +
      (hasNativeSpeed ? 25 : 10) +
      15 +
      (isHeadingValid(heading) ? 5 : 0)
  );

  return {
    accepted: true,
    hasNativeSpeed,
    headingValid: isHeadingValid(heading),
    qualityScore,
  };
}
