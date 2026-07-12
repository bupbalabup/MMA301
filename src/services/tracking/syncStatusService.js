import { listPendingCloudSyncTrips, listTrips } from '../../database/repositories/tripRepository';
import { EMPTY_VALUE } from '../../utils/format';
import { timestampToMillis } from '../../utils/timestamp';

export async function getLocalSyncStatus() {
  const [trips, pendingTrips] = await Promise.all([
    listTrips(),
    listPendingCloudSyncTrips(),
  ]);

  const lastSyncedAt = trips.reduce((latest, trip) => {
    const syncedAt = timestampToMillis(trip.cloudSyncedAt);
    return Number.isFinite(syncedAt) && syncedAt > latest ? syncedAt : latest;
  }, 0);

  return {
    cacheStatus: 'Sẵn sàng',
    firestoreStatus: 'Chưa kiểm tra',
    lastSyncedAt: lastSyncedAt || null,
    pendingTripCount: pendingTrips.length,
    sqliteStatus: 'Sẵn sàng',
    syncSummary: lastSyncedAt ? null : EMPTY_VALUE,
  };
}
