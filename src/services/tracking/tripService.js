import {
  createTrip,
  endTrip,
  getTripById,
  listTripsByDate,
  updateTrip,
} from '../../database/repositories/tripRepository';
import {
  addGpsPoint,
  deleteGpsPointsAfterTimestamp,
  listGpsPointsByTrip,
  listGpsPointsByTripRange,
} from '../../database/repositories/gpsPointRepository';
import { CLOUD_SYNC_STATUS } from '../../constants/history';
import { getTodayDateKey } from '../../utils/date';
import {
  calculateDistanceKm,
  normalizeLocationToGpsPoint,
} from '../../utils/geo';
import { createId } from '../../utils/id';
import { calculateTripStats } from './tripStatsService';

export async function createAutoTrip(location) {
  const timestamp = location?.timestamp ?? Date.now();
  const createdAt = Date.now();

  return createTrip({
    id: createId('trip'),
    date: getTodayDateKey(timestamp),
    startTime: timestamp,
    status: 'active',
    createdAt,
    updatedAt: createdAt,
  });
}

export async function addLocationToTrip(
  trip,
  location,
  previousPoint = null,
  accumulator = {}
) {
  const point = normalizeLocationToGpsPoint(location, trip.id, previousPoint);
  const savedPoint = await addGpsPoint(point);
  const previousPointCount = Math.max(0, accumulator.pointCount ?? 0);
  const pointCount = previousPointCount + 1;
  const previousSpeedSumKmh = Math.max(0, accumulator.speedSumKmh ?? 0);
  const speedSumKmh = previousSpeedSumKmh + Math.max(0, savedPoint.speedKmh ?? 0);
  const addedDistanceKm =
    previousPointCount > 0 && previousPoint
      ? calculateDistanceKm(previousPoint, savedPoint)
      : 0;
  const totalDistanceKm =
    Math.max(0, Number(trip.totalDistanceKm) || 0) + addedDistanceKm;
  const durationMs = Math.max(0, savedPoint.timestamp - trip.startTime);
  const maxSpeedKmh = Math.max(
    Number(trip.maxSpeedKmh) || 0,
    Number(savedPoint.speedKmh) || 0
  );

  const updatedTrip = await updateTrip(trip.id, {
    avgSpeedKmh: pointCount > 0 ? speedSumKmh / pointCount : 0,
    durationMs,
    endTime: savedPoint.timestamp,
    maxSpeedKmh,
    totalDistanceKm,
    startLatitude: trip.startLatitude ?? savedPoint.latitude,
    startLongitude: trip.startLongitude ?? savedPoint.longitude,
    endLatitude: savedPoint.latitude,
    endLongitude: savedPoint.longitude,
  });

  return {
    ...savedPoint,
    accumulator: {
      pointCount,
      speedSumKmh,
    },
    trip: updatedTrip,
  };
}

export async function getTodayDistanceKm(timestamp = Date.now()) {
  const trips = await listTripsByDate(getTodayDateKey(timestamp));

  return trips.reduce((total, trip) => {
    const distance = Number(trip.totalDistanceKm);
    return total + (Number.isFinite(distance) && distance > 0 ? distance : 0);
  }, 0);
}

export async function completeAutoTrip(tripId, data = {}) {
  const trip = await getTripById(tripId);
  const allPoints = await listGpsPointsByTrip(tripId);
  const fallbackEndTime = allPoints[allPoints.length - 1]?.timestamp ?? Date.now();
  const endTime = data.endTime ?? fallbackEndTime;

  await deleteGpsPointsAfterTimestamp(tripId, endTime);

  const hasTripStartTime = Number.isFinite(trip?.startTime);
  const points = hasTripStartTime
    ? await listGpsPointsByTripRange(tripId, trip.startTime, endTime)
    : await listGpsPointsByTrip(tripId);
  const stats = calculateTripStats(points, {
    startTime: hasTripStartTime ? trip.startTime : undefined,
    endTime,
  });
  const firstPoint = points[0] ?? null;
  const lastPoint = points[points.length - 1] ?? null;

  return endTrip(tripId, {
    ...stats,
    ...data,
    endTime,
    startLatitude: firstPoint?.latitude ?? null,
    startLongitude: firstPoint?.longitude ?? null,
    endLatitude: lastPoint?.latitude ?? null,
    endLongitude: lastPoint?.longitude ?? null,
    status: 'completed',
    cloudSyncStatus: CLOUD_SYNC_STATUS.PENDING,
    cloudSyncedAt: null,
    cloudSyncError: null,
    cloudSyncAttempts: trip?.cloudSyncAttempts ?? 0,
  });
}

export async function interruptAutoTrip(tripId, data = {}) {
  const points = await listGpsPointsByTrip(tripId);
  const stats = calculateTripStats(points);
  const firstPoint = points[0] ?? null;
  const lastPoint = points[points.length - 1] ?? null;

  return endTrip(tripId, {
    ...stats,
    ...data,
    startLatitude: firstPoint?.latitude ?? null,
    startLongitude: firstPoint?.longitude ?? null,
    endLatitude: lastPoint?.latitude ?? null,
    endLongitude: lastPoint?.longitude ?? null,
    status: 'interrupted',
    endTime: Date.now(),
  });
}
