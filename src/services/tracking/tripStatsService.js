import {
  calculateAverageSpeedKmh,
  calculateDistanceKm,
  calculateMaxSpeedKmh,
  calculateSpeedKmh,
  calculateTotalDistanceKm,
} from '../../utils/geo';
import {
  listTripsByDate,
  updateTrip,
} from '../../database/repositories/tripRepository';
import {
  countGpsPointsByTrip,
  countGpsPointsByTripRange,
  listGpsPointsByTrip,
  listGpsPointsByTripRange,
} from '../../database/repositories/gpsPointRepository';
import {
  MAX_ACCEPTABLE_ACCURACY_METERS,
  MAX_JUMP_DISTANCE_METERS,
  MIN_VALID_POINT_INTERVAL_MS,
  SINGLE_POINT_SPIKE_SPEED_KMH,
} from '../../constants/tracking';

export function calculateTripStats(points, boundaries = {}) {
  if (!Array.isArray(points) || points.length === 0) {
    const hasBoundaries =
      Number.isFinite(boundaries.startTime) && Number.isFinite(boundaries.endTime);

    return {
      durationMs: hasBoundaries
        ? Math.max(0, boundaries.endTime - boundaries.startTime)
        : 0,
      totalDistanceKm: 0,
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
    };
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const startTime = boundaries.startTime ?? firstPoint.timestamp;
  const endTime = boundaries.endTime ?? lastPoint.timestamp;

  return {
    durationMs: Math.max(0, endTime - startTime),
    totalDistanceKm: calculateTotalDistanceKm(points),
    avgSpeedKmh: calculateAverageSpeedKmh(points),
    maxSpeedKmh: calculateMaxSpeedKmh(points),
  };
}

export function buildTripSummary(trip, points) {
  const tripPoints = Array.isArray(points) ? points : [];
  const stats = calculateTripStats(tripPoints);
  const firstPoint = tripPoints[0] ?? null;
  const lastPoint = tripPoints[tripPoints.length - 1] ?? null;

  return {
    tripId: trip.id,
    date: trip.date,
    startTime: trip.startTime,
    endTime: trip.endTime,
    status: trip.status,
    pointCount: tripPoints.length,
    ...stats,
    startLatitude: trip.startLatitude ?? firstPoint?.latitude ?? null,
    startLongitude: trip.startLongitude ?? firstPoint?.longitude ?? null,
    endLatitude: trip.endLatitude ?? lastPoint?.latitude ?? null,
    endLongitude: trip.endLongitude ?? lastPoint?.longitude ?? null,
    startAddress: trip.startAddress ?? null,
    endAddress: trip.endAddress ?? null,
  };
}

function sumTrips(trips, fieldName) {
  return trips.reduce((total, trip) => {
    const value = trip[fieldName];
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function calculateStoppedDurationMs(trips) {
  const sortedTrips = [...trips].sort((tripA, tripB) => {
    return (tripA.startTime ?? 0) - (tripB.startTime ?? 0);
  });

  let stoppedDurationMs = 0;

  for (let index = 1; index < sortedTrips.length; index += 1) {
    const previousTrip = sortedTrips[index - 1];
    const currentTrip = sortedTrips[index];

    if (!previousTrip.endTime || !currentTrip.startTime) {
      continue;
    }

    stoppedDurationMs += Math.max(
      0,
      currentTrip.startTime - previousTrip.endTime
    );
  }

  return stoppedDurationMs;
}

function isValidHistoricalCoordinate(point) {
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

function hasPoorAccuracy(point) {
  return (
    Number.isFinite(point?.accuracy) &&
    point.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS
  );
}

function sortByTimestamp(points) {
  return [...points].sort((pointA, pointB) => {
    return (pointA.timestamp ?? 0) - (pointB.timestamp ?? 0);
  });
}

function buildAcceptedHistoricalPoints(points) {
  const acceptedPoints = [];
  let pendingHighSpeedCount = 0;

  for (const point of sortByTimestamp(points)) {
    if (!isValidHistoricalCoordinate(point) || hasPoorAccuracy(point)) {
      continue;
    }

    if (acceptedPoints.length === 0) {
      acceptedPoints.push({
        ...point,
        speedKmh: 0,
      });
      pendingHighSpeedCount = 0;
      continue;
    }

    const previousPoint = acceptedPoints[acceptedPoints.length - 1];
    const elapsedTimeMs = point.timestamp - previousPoint.timestamp;

    if (!Number.isFinite(elapsedTimeMs) || elapsedTimeMs <= 0) {
      continue;
    }

    if (elapsedTimeMs < MIN_VALID_POINT_INTERVAL_MS) {
      continue;
    }

    const distanceMeters = calculateDistanceKm(previousPoint, point) * 1000;
    const rawSpeedKmh = calculateSpeedKmh(previousPoint, point);

    if (
      distanceMeters > MAX_JUMP_DISTANCE_METERS &&
      rawSpeedKmh > SINGLE_POINT_SPIKE_SPEED_KMH
    ) {
      pendingHighSpeedCount = 0;
      continue;
    }

    if (rawSpeedKmh > SINGLE_POINT_SPIKE_SPEED_KMH) {
      pendingHighSpeedCount += 1;

      if (pendingHighSpeedCount < 2) {
        continue;
      }
    } else {
      pendingHighSpeedCount = 0;
    }

    acceptedPoints.push({
      ...point,
      speedKmh: rawSpeedKmh,
    });
  }

  return acceptedPoints;
}

function isSuspiciousStoredSpeed(speedKmh) {
  return !Number.isFinite(speedKmh) || speedKmh > SINGLE_POINT_SPIKE_SPEED_KMH;
}

function buildRepairedTrip(trip, acceptedPoints) {
  if (acceptedPoints.length < 2) {
    return {
      ...trip,
      maxSpeedKmh: isSuspiciousStoredSpeed(trip.maxSpeedKmh)
        ? null
        : trip.maxSpeedKmh,
      hasReliableRepair: false,
    };
  }

  const stats = calculateTripStats(acceptedPoints, {
    startTime: trip.startTime,
    endTime: trip.endTime,
  });

  return {
    ...trip,
    totalDistanceKm: stats.totalDistanceKm,
    avgSpeedKmh: stats.avgSpeedKmh,
    maxSpeedKmh: stats.maxSpeedKmh,
    hasReliableRepair: true,
  };
}

function shouldPersistHistoricalRepair(originalTrip, repairedTrip) {
  if (!repairedTrip.hasReliableRepair) {
    return false;
  }

  return (
    isSuspiciousStoredSpeed(originalTrip.maxSpeedKmh) ||
    !Number.isFinite(originalTrip.totalDistanceKm) ||
    !Number.isFinite(originalTrip.avgSpeedKmh)
  );
}

export async function repairTripStatsIfNeeded(trip) {
  const hasTripBounds =
    Number.isFinite(trip.startTime) && Number.isFinite(trip.endTime);
  const points = hasTripBounds
    ? await listGpsPointsByTripRange(trip.id, trip.startTime, trip.endTime)
    : await listGpsPointsByTrip(trip.id);
  const acceptedPoints = buildAcceptedHistoricalPoints(points);
  const repairedTrip = buildRepairedTrip(trip, acceptedPoints);

  if (shouldPersistHistoricalRepair(trip, repairedTrip)) {
    await updateTrip(trip.id, {
      totalDistanceKm: repairedTrip.totalDistanceKm,
      avgSpeedKmh: repairedTrip.avgSpeedKmh,
      maxSpeedKmh: repairedTrip.maxSpeedKmh,
    });
  }

  return {
    ...repairedTrip,
    gpsPointCountForSummary: acceptedPoints.length,
  };
}

export async function buildDailySummary(date) {
  const trips = await listTripsByDate(date);
  const repairedTrips = await Promise.all(
    trips.map((trip) => repairTripStatsIfNeeded(trip))
  );
  const gpsPointCounts = await Promise.all(
    repairedTrips.map((trip) => {
      if (Number.isFinite(trip.startTime) && Number.isFinite(trip.endTime)) {
        return countGpsPointsByTripRange(trip.id, trip.startTime, trip.endTime);
      }

      return countGpsPointsByTrip(trip.id);
    })
  );
  const gpsPointCount = gpsPointCounts.reduce((total, count) => total + count, 0);
  const movingDurationMs = sumTrips(repairedTrips, 'durationMs');
  const totalDistanceKm = sumTrips(repairedTrips, 'totalDistanceKm');
  const validMaxSpeeds = repairedTrips
    .map((trip) => trip.maxSpeedKmh)
    .filter((speedKmh) => Number.isFinite(speedKmh) && speedKmh >= 0);

  return {
    date,
    tripCount: repairedTrips.length,
    totalDistanceKm,
    movingDurationMs,
    stoppedDurationMs: calculateStoppedDurationMs(repairedTrips),
    maxSpeedKmh:
      validMaxSpeeds.length > 0 ? Math.max(...validMaxSpeeds) : null,
    avgSpeedKmh:
      movingDurationMs > 0
        ? totalDistanceKm / (movingDurationMs / 3600000)
        : 0,
    gpsPointCount,
    trips: repairedTrips,
  };
}
