import { getDatabase } from '../database';

const GPS_POINT_COLUMNS = `
  id,
  tripId,
  latitude,
  longitude,
  speedKmh,
  heading,
  accuracy,
  altitude,
  timestamp,
  createdAt
`;

function toGpsPointParams(point) {
  return [
    point.id,
    point.tripId,
    point.latitude,
    point.longitude,
    point.speedKmh ?? null,
    point.heading ?? null,
    point.accuracy ?? null,
    point.altitude ?? null,
    point.timestamp,
    point.createdAt ?? Date.now(),
  ];
}

async function insertGpsPoint(db, point) {
  await db.runAsync(
    `
      INSERT INTO gps_points (${GPS_POINT_COLUMNS})
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    toGpsPointParams(point)
  );
}

export async function addGpsPoint(point) {
  const db = getDatabase();
  await insertGpsPoint(db, point);
  return getLatestGpsPoint(point.tripId);
}

export async function addGpsPoints(points) {
  const db = getDatabase();

  await db.withTransactionAsync(async () => {
    for (const point of points) {
      await insertGpsPoint(db, point);
    }
  });

  return points.length;
}

export async function listGpsPointsByTrip(tripId) {
  const db = getDatabase();

  return db.getAllAsync(
    `
      SELECT ${GPS_POINT_COLUMNS}
      FROM gps_points
      WHERE tripId = ?
      ORDER BY timestamp ASC
    `,
    [tripId]
  );
}

export async function listGpsPointsByTripRange(
  tripId,
  startTime,
  endTime
) {
  const db = getDatabase();

  return db.getAllAsync(
    `
      SELECT ${GPS_POINT_COLUMNS}
      FROM gps_points
      WHERE tripId = ? AND timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `,
    [tripId, startTime, endTime]
  );
}

export async function getLatestGpsPoint(tripId) {
  const db = getDatabase();

  return db.getFirstAsync(
    `
      SELECT ${GPS_POINT_COLUMNS}
      FROM gps_points
      WHERE tripId = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `,
    [tripId]
  );
}

export async function getFirstGpsPoint(tripId) {
  const db = getDatabase();

  return db.getFirstAsync(
    `
      SELECT ${GPS_POINT_COLUMNS}
      FROM gps_points
      WHERE tripId = ?
      ORDER BY timestamp ASC
      LIMIT 1
    `,
    [tripId]
  );
}

export async function countGpsPointsByTripRange(tripId, startTime, endTime) {
  const db = getDatabase();
  const result = await db.getFirstAsync(
    `
      SELECT COUNT(*) AS pointCount
      FROM gps_points
      WHERE tripId = ? AND timestamp >= ? AND timestamp <= ?
    `,
    [tripId, startTime, endTime]
  );

  return result?.pointCount ?? 0;
}

export async function countGpsPointsByTrip(tripId) {
  const db = getDatabase();
  const result = await db.getFirstAsync(
    'SELECT COUNT(*) AS pointCount FROM gps_points WHERE tripId = ?',
    [tripId]
  );

  return result?.pointCount ?? 0;
}

export async function deleteGpsPointsByTrip(tripId) {
  const db = getDatabase();
  const result = await db.runAsync(
    'DELETE FROM gps_points WHERE tripId = ?',
    [tripId]
  );

  return result.changes ?? 0;
}

export async function deleteGpsPointsAfterTimestamp(tripId, timestamp) {
  const db = getDatabase();
  const result = await db.runAsync(
    'DELETE FROM gps_points WHERE tripId = ? AND timestamp > ?',
    [tripId, timestamp]
  );

  return result.changes ?? 0;
}
