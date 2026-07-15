export const MOVING_SPEED_THRESHOLD_KMH = 5;
export const MOVING_DISTANCE_THRESHOLD_METERS = 25;
export const PARKING_RADIUS_METERS = 30;
export const TEMPORARY_STOP_DURATION_MS = 30 * 1000;
export const PARKING_DURATION_MS = 3 * 60 * 1000;
export const GPS_LOST_TIMEOUT_MS = 30 * 1000;
export const DEFAULT_GPS_INTERVAL_MS = 1000;
export const REMOTE_DEVICE_OFFLINE_TIMEOUT_MS = 60 * 1000;
export const LIVE_LOCATION_HEARTBEAT_INTERVAL_MS = 30 * 1000;
export const MIN_VALID_POINT_INTERVAL_MS = 500;
export const MAX_ACCEPTABLE_ACCURACY_METERS = 35;
export const SINGLE_POINT_SPIKE_SPEED_KMH = 500;
export const SPIKE_CONFIRMATION_COUNT = 2;
export const MAX_JUMP_DISTANCE_METERS = 1000;

export const MOTION_DETECTION_CONFIG = Object.freeze({
  accelerationWindowMs: 5000,
  acceptableAccuracyQualityScore: 35,
  coordinateAccuracyMultiplier: 2,
  coordinateDistanceMultiplier: 3,
  coordinateJumpMinimumMeters: 100,
  coordinateJumpPaddingMeters: 25,
  excellentAccuracyMeters: 10,
  excellentAccuracyQualityScore: 55,
  fallbackSpeedQualityScore: 10,
  goodAccuracyMeters: 20,
  goodAccuracyQualityScore: 45,
  headingConsistencyDegrees: 75,
  headingQualityScore: 5,
  headingNoiseDegrees: 120,
  inconsistentHeadingConfidenceMultiplier: 0.8,
  maxAccelerationKmhPerSecond: 45,
  maxAccuracyMeters: MAX_ACCEPTABLE_ACCURACY_METERS,
  maxConfidenceConsecutiveContribution: 15,
  maxConfidenceDistanceContribution: 20,
  maxConfidenceDurationContribution: 5,
  maxConfidenceQualityContribution: 35,
  maxConfidenceSpeedContribution: 25,
  maxFallbackSpeedKmh: 320,
  maxFutureTimestampSkewMs: 60 * 1000,
  maxNativeSpeedKmh: 320,
  minDistanceIncrementMeters: 8,
  movementConfidenceThreshold: 70,
  movementDistanceMeters: MOVING_DISTANCE_THRESHOLD_METERS,
  movementSpeedKmh: MOVING_SPEED_THRESHOLD_KMH,
  nativeSpeedQualityScore: 25,
  requiredMovingSamples: 5,
  speedConfidenceRangeKmh: 18,
  speedMedianSampleCount: 3,
  stationaryHeartbeatMs: 30 * 1000,
  stationaryRadiusMeters: 18,
  stationarySpeedKmh: 2,
  timestampQualityScore: 15,
  unknownAccuracyQualityScore: 20,
});

export const TRACKING_STATUS = {
  IDLE: 'Idle',
  MOVING: 'Moving',
  PAUSED: 'Paused',
  PARKING: 'Parking',
  OFFLINE: 'Offline',
  GPS_LOST: 'GPS Lost',
};
