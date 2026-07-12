import {
  getTripById,
  listPendingCloudSyncTrips,
  updateTripCloudSyncStatus,
} from '../../database/repositories/tripRepository';
import {
  listGpsPointsByTrip,
  listGpsPointsByTripRange,
} from '../../database/repositories/gpsPointRepository';
import { CLOUD_SYNC_STATUS } from '../../constants/history';
import { uploadCompletedTrip } from '../firebase/tripHistoryCloudService';

const syncingTripIds = new Set();
let pendingBatch = null;

function getErrorMessage(error) {
  return error?.message ?? 'Unknown cloud sync error.';
}

async function getBoundedTripPoints(trip) {
  if (Number.isFinite(trip?.startTime) && Number.isFinite(trip?.endTime)) {
    return listGpsPointsByTripRange(trip.id, trip.startTime, trip.endTime);
  }

  return listGpsPointsByTrip(trip.id);
}

export async function syncCompletedTrip(uid, localDeviceId, trip) {
  if (!uid || !localDeviceId || !trip?.id) {
    return { synced: false, skipped: true, reason: 'missing_context' };
  }

  if (trip.status !== 'completed') {
    return { synced: false, skipped: true, reason: 'trip_not_completed' };
  }

  if (trip.cloudSyncStatus === CLOUD_SYNC_STATUS.SYNCED) {
    return { synced: true, skipped: true, reason: 'already_synced' };
  }

  if (syncingTripIds.has(trip.id)) {
    return { synced: false, skipped: true, reason: 'already_syncing' };
  }

  syncingTripIds.add(trip.id);

  const attempts = Number.isFinite(trip.cloudSyncAttempts)
    ? trip.cloudSyncAttempts + 1
    : 1;

  try {
    await updateTripCloudSyncStatus(trip.id, {
      cloudSyncStatus: CLOUD_SYNC_STATUS.SYNCING,
      cloudSyncError: null,
      cloudSyncAttempts: attempts,
    });

    const points = await getBoundedTripPoints(trip);
    await uploadCompletedTrip(uid, localDeviceId, trip, points);

    return updateTripCloudSyncStatus(trip.id, {
      cloudSyncStatus: CLOUD_SYNC_STATUS.SYNCED,
      cloudSyncedAt: Date.now(),
      cloudSyncError: null,
      cloudSyncAttempts: attempts,
    });
  } catch (error) {
    await updateTripCloudSyncStatus(trip.id, {
      cloudSyncStatus: CLOUD_SYNC_STATUS.FAILED,
      cloudSyncError: getErrorMessage(error),
      cloudSyncAttempts: attempts,
    });

    throw error;
  } finally {
    syncingTripIds.delete(trip.id);
  }
}

export async function syncCompletedTripById(uid, localDeviceId, tripId) {
  const trip = await getTripById(tripId);

  if (!trip) {
    return { synced: false, skipped: true, reason: 'trip_not_found' };
  }

  return syncCompletedTrip(uid, localDeviceId, trip);
}

export async function syncPendingTrips(uid, localDeviceId) {
  if (!uid || !localDeviceId) {
    return [];
  }

  const batchKey = `${uid}:${localDeviceId}`;

  if (pendingBatch?.key === batchKey) {
    return pendingBatch.promise;
  }

  const promise = (async () => {
    const pendingTrips = await listPendingCloudSyncTrips();
    const results = [];

    for (const trip of pendingTrips) {
      try {
        const result = await syncCompletedTrip(uid, localDeviceId, trip);
        results.push({ tripId: trip.id, ok: true, result });
      } catch (error) {
        results.push({
          tripId: trip.id,
          ok: false,
          error: getErrorMessage(error),
        });
      }
    }

    return results;
  })();
  pendingBatch = { key: batchKey, promise };

  try {
    return await promise;
  } finally {
    if (pendingBatch?.promise === promise) {
      pendingBatch = null;
    }
  }
}
