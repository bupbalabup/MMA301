const assert = require('node:assert/strict');
const path = require('node:path');

const babel = require('@babel/core');
const transformModules = require('@babel/plugin-transform-modules-commonjs');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'src');
const originalJavaScriptLoader = require.extensions['.js'];

global.__DEV__ = false;

require.extensions['.js'] = function loadProjectModule(module, filename) {
  if (!filename.startsWith(sourceRoot)) {
    return originalJavaScriptLoader(module, filename);
  }

  const transformed = babel.transformFileSync(filename, {
    babelrc: false,
    configFile: false,
    plugins: [transformModules],
    sourceMaps: 'inline',
  });
  module._compile(transformed.code, filename);
};

const {
  createMotionDetectionState,
} = require('../src/services/tracking/motionDetectionEngine');
const {
  processMotionSample,
} = require('../src/services/tracking/motionSampleProcessor');

const METERS_PER_LONGITUDE_DEGREE = 111320;

function buildLocation({
  accuracy = 5,
  heading = 90,
  latitude = 10,
  offsetMeters = 0,
  speedKmh = 0,
  timestamp,
}) {
  return {
    coords: {
      accuracy,
      altitude: 0,
      heading,
      latitude,
      longitude: 106 + offsetMeters / METERS_PER_LONGITUDE_DEGREE,
      speed: speedKmh / 3.6,
    },
    timestamp,
  };
}

function createHarness() {
  return {
    motionState: createMotionDetectionState(),
    previousAcceptedPoint: null,
    recentSpeedSamplesKmh: [],
  };
}

function process(harness, location) {
  const result = processMotionSample({
    location,
    motionState: harness.motionState,
    previousAcceptedPoint: harness.previousAcceptedPoint,
    recentSpeedSamplesKmh: harness.recentSpeedSamplesKmh,
  });

  harness.motionState = result.nextMotionState ?? harness.motionState;
  harness.recentSpeedSamplesKmh =
    result.nextSpeedSamplesKmh ?? harness.recentSpeedSamplesKmh;
  if (result.accepted) {
    harness.previousAcceptedPoint = result.currentPoint;
  }

  return result;
}

const baseTimestamp = Date.now();

const stationaryHarness = createHarness();
const baseline = process(
  stationaryHarness,
  buildLocation({ timestamp: baseTimestamp })
);
assert.equal(baseline.accepted, true, 'Baseline stationary point must be accepted.');

for (const [index, offsetMeters] of [3, 5, 4, 6].entries()) {
  const drift = process(
    stationaryHarness,
    buildLocation({
      offsetMeters,
      timestamp: baseTimestamp + (index + 1) * 1000,
    })
  );
  assert.equal(drift.accepted, false, 'Stationary drift must not be accepted.');
  assert.equal(drift.reason, 'gps_drift');
  assert.equal(drift.shouldAdvanceStationaryState, true);
}
assert.equal(
  stationaryHarness.motionState.stationaryCenter.longitude,
  baseline.currentPoint.longitude,
  'GPS drift must not move the stationary center.'
);

const poorAccuracy = process(
  createHarness(),
  buildLocation({ accuracy: 36, timestamp: baseTimestamp })
);
assert.equal(poorAccuracy.accepted, false);
assert.equal(poorAccuracy.reason, 'poor_accuracy');

const duplicateTimestamp = process(
  stationaryHarness,
  buildLocation({ offsetMeters: 30, speedKmh: 20, timestamp: baseTimestamp })
);
assert.equal(duplicateTimestamp.accepted, false);
assert.equal(duplicateTimestamp.reason, 'timestamp_invalid');

const spikeHarness = createHarness();
process(spikeHarness, buildLocation({ timestamp: baseTimestamp }));
const speedSpike = process(
  spikeHarness,
  buildLocation({
    offsetMeters: 33,
    speedKmh: 120,
    timestamp: baseTimestamp + 1000,
  })
);
assert.equal(speedSpike.accepted, false);
assert.equal(speedSpike.reason, 'speed_spike');

const impossibleNativeSpeed = process(
  createHarness(),
  buildLocation({ speedKmh: 400, timestamp: baseTimestamp })
);
assert.equal(impossibleNativeSpeed.accepted, false);
assert.equal(impossibleNativeSpeed.reason, 'speed_spike');

const movementHarness = createHarness();
process(movementHarness, buildLocation({ timestamp: baseTimestamp }));
let movementResult = null;
for (let sampleIndex = 1; sampleIndex <= 5; sampleIndex += 1) {
  movementResult = process(
    movementHarness,
    buildLocation({
      offsetMeters: sampleIndex * 6,
      speedKmh: 20,
      timestamp: baseTimestamp + sampleIndex * 1000,
    })
  );

  if (sampleIndex < 5) {
    assert.equal(movementResult.accepted, false);
    assert.equal(movementResult.reason, 'confidence_low');
  }
}
assert.equal(movementResult.accepted, true);
assert.equal(movementResult.isMoving, true);
assert.ok(movementResult.movementConfidence >= 70);
assert.equal(
  movementResult.speedResult.coordinateSpeedKmh,
  null,
  'Haversine speed must not be calculated when native speed is valid.'
);

const firstStoppedSample = process(
  movementHarness,
  buildLocation({
    offsetMeters: 34,
    speedKmh: 0,
    timestamp: baseTimestamp + 6000,
  })
);
assert.equal(firstStoppedSample.accepted, true);
assert.equal(firstStoppedSample.isMoving, false);
assert.equal(firstStoppedSample.shouldPersistPoint, false);

const parkedDrift = process(
  movementHarness,
  buildLocation({
    offsetMeters: 38,
    speedKmh: 0,
    timestamp: baseTimestamp + 7000,
  })
);
assert.equal(parkedDrift.accepted, false);
assert.equal(parkedDrift.reason, 'gps_drift');

console.log('Motion detection simulation passed.');
