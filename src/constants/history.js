export const GPS_POINTS_PER_CHUNK = 150;
export const REMOTE_HISTORY_PAGE_SIZE = 30;

export const HISTORY_SOURCE = {
  LOCAL: 'local',
  CLOUD: 'cloud',
};

export const CLOUD_SYNC_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  FAILED: 'failed',
};

export function isTripPendingCloudSync(trip) {
  if (String(trip?.status ?? '').toLowerCase() !== 'completed') {
    return false;
  }

  const syncStatus = String(trip?.cloudSyncStatus ?? '').toLowerCase();
  return (
    !syncStatus ||
    syncStatus === CLOUD_SYNC_STATUS.PENDING ||
    syncStatus === CLOUD_SYNC_STATUS.SYNCING ||
    syncStatus === CLOUD_SYNC_STATUS.FAILED
  );
}

export function formatPendingTripCount(count) {
  const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;

  if (safeCount === 0) {
    return 'Không có chuyến đi nào đang chờ đồng bộ.';
  }

  if (safeCount === 1) {
    return 'Có 1 chuyến đi đang chờ đồng bộ.';
  }

  return `Có ${safeCount} chuyến đi đang chờ đồng bộ.`;
}
