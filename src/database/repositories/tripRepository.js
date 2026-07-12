import { getDatabase } from '../database';

const TRIP_COLUMNS = `
  id,
  date,
  startTime,
  endTime,
  durationMs,
  totalDistanceKm,
  avgSpeedKmh,
  maxSpeedKmh,
  startLatitude,
  startLongitude,
  endLatitude,
  endLongitude,
  startAddress,
  endAddress,
  status,
  cloudSyncStatus,
  cloudSyncedAt,
  cloudSyncError,
  cloudSyncAttempts,
  createdAt,
  updatedAt
`;

function now() {
  return Date.now();
}

function toTripParams(trip) {
  const createdAt = trip.createdAt ?? now();
  const updatedAt = trip.updatedAt ?? createdAt;
  const startTime = trip.startTime ?? now();

  return [
    trip.id,
    trip.date,
    startTime,
    trip.endTime ?? null,
    trip.durationMs ?? null,
    trip.totalDistanceKm ?? 0,
    trip.avgSpeedKmh ?? null,
    trip.maxSpeedKmh ?? null,
    trip.startLatitude ?? null,
    trip.startLongitude ?? null,
    trip.endLatitude ?? null,
    trip.endLongitude ?? null,
    trip.startAddress ?? null,
    trip.endAddress ?? null,
    trip.status ?? 'active',
    trip.cloudSyncStatus ?? null,
    trip.cloudSyncedAt ?? null,
    trip.cloudSyncError ?? null,
    trip.cloudSyncAttempts ?? 0,
    createdAt,
    updatedAt,
  ];
}

function createUpdateClause(data) {
  const entries = Object.entries({
    ...data,
    updatedAt: data.updatedAt ?? now(),
  }).filter(([, value]) => value !== undefined);

  return {
    setClause: entries.map(([key]) => `${key} = ?`).join(', '),
    values: entries.map(([, value]) => value),
  };
}

export async function createTrip(trip) {
  const db = getDatabase();

  await db.runAsync(
    `
      INSERT INTO trips (${TRIP_COLUMNS})
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    toTripParams(trip)
  );

  return getTripById(trip.id);
}

export async function updateTrip(tripId, data) {
  const db = getDatabase();
  const { setClause, values } = createUpdateClause(data);

  if (!setClause) {
    return getTripById(tripId);
  }

  await db.runAsync(`UPDATE trips SET ${setClause} WHERE id = ?`, [
    ...values,
    tripId,
  ]);

  return getTripById(tripId);
}

export async function endTrip(tripId, data) {
  return updateTrip(tripId, {
    ...data,
    status: data.status ?? 'completed',
    endTime: data.endTime ?? now(),
  });
}

export async function getTripById(tripId) {
  const db = getDatabase();

  return db.getFirstAsync(`SELECT ${TRIP_COLUMNS} FROM trips WHERE id = ?`, [
    tripId,
  ]);
}

export async function listTrips() {
  const db = getDatabase();

  return db.getAllAsync(`SELECT ${TRIP_COLUMNS} FROM trips ORDER BY startTime DESC`);
}

export async function listTripsByDate(date) {
  const db = getDatabase();

  return db.getAllAsync(
    `
      SELECT ${TRIP_COLUMNS}
      FROM trips
      WHERE date = ?
      ORDER BY startTime DESC
    `,
    [date]
  );
}

export async function listPendingCloudSyncTrips() {
  const db = getDatabase();

  return db.getAllAsync(
    `
      SELECT ${TRIP_COLUMNS}
      FROM trips
      WHERE status = 'completed'
        AND (
          cloudSyncStatus IS NULL OR
          cloudSyncStatus IN ('pending', 'failed', 'syncing')
        )
      ORDER BY endTime ASC
    `
  );
}

export async function listTripDates() {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `
      SELECT DISTINCT date
      FROM trips
      ORDER BY date DESC
    `
  );

  return rows.map((row) => row.date);
}

export async function getActiveTrip() {
  const db = getDatabase();

  return db.getFirstAsync(
    `
      SELECT ${TRIP_COLUMNS}
      FROM trips
      WHERE status = 'active'
      ORDER BY startTime DESC
      LIMIT 1
    `
  );
}

export async function deleteTrip(tripId) {
  const db = getDatabase();
  const result = await db.runAsync('DELETE FROM trips WHERE id = ?', [tripId]);

  return result.changes ?? 0;
}

export async function updateTripCloudSyncStatus(tripId, data) {
  return updateTrip(tripId, {
    cloudSyncStatus: data.cloudSyncStatus,
    cloudSyncedAt: data.cloudSyncedAt,
    cloudSyncError: data.cloudSyncError,
    cloudSyncAttempts: data.cloudSyncAttempts,
  });
}
