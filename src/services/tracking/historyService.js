import {
  getTripById,
  listTripDates,
} from '../../database/repositories/tripRepository';
import {
  countGpsPointsByTrip,
  getFirstGpsPoint,
  getLatestGpsPoint,
  listGpsPointsByTripRange,
  listGpsPointsByTrip,
} from '../../database/repositories/gpsPointRepository';
import { HISTORY_SOURCE } from '../../constants/history';
import {
  getCloudTripPlayback as getCloudTripPlaybackFromFirestore,
  getCloudTripSummary,
  listCloudTripSummaries,
} from '../firebase/tripHistoryCloudService';
import {
  buildDailySummary,
  repairTripStatsIfNeeded,
} from './tripStatsService';

export async function listAvailableTripDates() {
  return listTripDates();
}

export async function getDailySummary(date) {
  if (!date) {
    return null;
  }

  return buildDailySummary(date);
}

function calculateStoppedDurationMs(trips) {
  const sortedTrips = [...trips].sort(
    (tripA, tripB) => (tripA.startTime ?? 0) - (tripB.startTime ?? 0)
  );

  return sortedTrips.reduce((total, trip, index) => {
    if (index === 0) {
      return total;
    }

    const previousTrip = sortedTrips[index - 1];
    const gapMs = (trip.startTime ?? 0) - (previousTrip.endTime ?? 0);
    return total + Math.max(0, gapMs);
  }, 0);
}

function buildCloudDailySummary(date, trips) {
  const tripCount = trips.length;
  const totalDistanceKm = trips.reduce(
    (total, trip) => total + (trip.totalDistanceKm ?? 0),
    0
  );
  const movingDurationMs = trips.reduce(
    (total, trip) => total + (trip.durationMs ?? 0),
    0
  );
  const gpsPointCount = trips.reduce(
    (total, trip) => total + (trip.gpsPointCount ?? 0),
    0
  );
  const maxSpeedKmh = trips.reduce(
    (maxSpeed, trip) => Math.max(maxSpeed, trip.maxSpeedKmh ?? 0),
    0
  );
  const avgSpeedKmh =
    movingDurationMs > 0
      ? totalDistanceKm / (movingDurationMs / 3600000)
      : 0;

  return {
    date,
    tripCount,
    totalDistanceKm,
    movingDurationMs,
    stoppedDurationMs: calculateStoppedDurationMs(trips),
    maxSpeedKmh,
    avgSpeedKmh,
    gpsPointCount,
    trips: [...trips].sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0)),
  };
}

export async function listCloudAvailableTripDates(uid, deviceId) {
  const summaries = await listCloudTripSummaries(uid, deviceId);
  const dates = summaries
    .map((trip) => trip.date)
    .filter(Boolean);

  return [...new Set(dates)].sort((dateA, dateB) => dateB.localeCompare(dateA));
}

export async function getCloudDailySummary(uid, deviceId, date) {
  if (!date) {
    return null;
  }

  const summaries = await listCloudTripSummaries(uid, deviceId);
  const trips = summaries.filter((trip) => trip.date === date);

  return buildCloudDailySummary(date, trips);
}

export async function getTripDetail(tripId) {
  if (!tripId) {
    throw new Error('Trip ID is required.');
  }

  const storedTrip = await getTripById(tripId);

  if (!storedTrip) {
    return null;
  }

  const trip = await repairTripStatsIfNeeded(storedTrip);

  const hasTripBounds = Number.isFinite(trip.startTime) && Number.isFinite(trip.endTime);

  if (hasTripBounds) {
    const gpsPoints = await listGpsPointsByTripRange(
      tripId,
      trip.startTime,
      trip.endTime
    );

    return {
      trip,
      gpsPointCount: gpsPoints.length,
      firstGpsPoint: gpsPoints[0] ?? null,
      lastGpsPoint: gpsPoints[gpsPoints.length - 1] ?? null,
    };
  }

  const [gpsPointCount, firstGpsPoint, lastGpsPoint] = await Promise.all([
    countGpsPointsByTrip(tripId),
    getFirstGpsPoint(tripId),
    getLatestGpsPoint(tripId),
  ]);

  return {
    trip,
    gpsPointCount,
    firstGpsPoint,
    lastGpsPoint,
  };
}

export async function getCloudTripDetail(uid, deviceId, tripId) {
  if (!uid || !deviceId || !tripId) {
    throw new Error('Cloud trip detail requires user, device, and trip ID.');
  }

  const trip = await getCloudTripSummary(uid, deviceId, tripId);

  if (!trip) {
    return null;
  }

  const firstGpsPoint =
    Number.isFinite(trip.startLatitude) && Number.isFinite(trip.startLongitude)
      ? {
          latitude: trip.startLatitude,
          longitude: trip.startLongitude,
          timestamp: trip.startTime,
        }
      : null;
  const lastGpsPoint =
    Number.isFinite(trip.endLatitude) && Number.isFinite(trip.endLongitude)
      ? {
          latitude: trip.endLatitude,
          longitude: trip.endLongitude,
          timestamp: trip.endTime,
        }
      : null;

  return {
    trip,
    gpsPointCount: trip.gpsPointCount ?? 0,
    firstGpsPoint,
    lastGpsPoint,
    source: HISTORY_SOURCE.CLOUD,
  };
}

export async function getTripDetailBySource({
  source = HISTORY_SOURCE.LOCAL,
  uid,
  deviceId,
  tripId,
}) {
  if (source === HISTORY_SOURCE.CLOUD) {
    return getCloudTripDetail(uid, deviceId, tripId);
  }

  return getTripDetail(tripId);
}

export async function getTripPlayback(tripId) {
  if (!tripId) {
    throw new Error('Trip ID is required.');
  }

  const trip = await getTripById(tripId);

  if (!trip) {
    return null;
  }

  const hasTripBounds = Number.isFinite(trip.startTime) && Number.isFinite(trip.endTime);
  const gpsPoints = hasTripBounds
    ? await listGpsPointsByTripRange(tripId, trip.startTime, trip.endTime)
    : await listGpsPointsByTrip(tripId);

  return {
    trip,
    gpsPoints: Array.isArray(gpsPoints) ? gpsPoints : [],
  };
}

export async function getCloudTripPlayback(uid, deviceId, tripId) {
  if (!uid || !deviceId || !tripId) {
    throw new Error('Cloud playback requires user, device, and trip ID.');
  }

  return getCloudTripPlaybackFromFirestore(uid, deviceId, tripId);
}

export async function getTripPlaybackBySource({
  source = HISTORY_SOURCE.LOCAL,
  uid,
  deviceId,
  tripId,
}) {
  if (source === HISTORY_SOURCE.CLOUD) {
    return getCloudTripPlayback(uid, deviceId, tripId);
  }

  return getTripPlayback(tripId);
}
