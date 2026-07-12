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
import { normalizeLocationToGpsPoint } from '../../utils/geo';
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

export async function addLocationToTrip(trip, location, previousPoint = null) {
  const point = normalizeLocationToGpsPoint(location, trip.id, previousPoint);
  const savedPoint = await addGpsPoint(point);
  const points = await listGpsPointsByTrip(trip.id);
  const stats = calculateTripStats(points);
  const firstPoint = points[0] ?? savedPoint;

  const updatedTrip = await updateTrip(trip.id, {
    ...stats,
    endTime: savedPoint.timestamp,
    startLatitude: trip.startLatitude ?? firstPoint.latitude,
    startLongitude: trip.startLongitude ?? firstPoint.longitude,
    endLatitude: savedPoint.latitude,
    endLongitude: savedPoint.longitude,
  });

  return {
    ...savedPoint,
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
