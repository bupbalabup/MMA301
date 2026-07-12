import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import {
  GPS_POINTS_PER_CHUNK,
  REMOTE_HISTORY_PAGE_SIZE,
} from '../../constants/history';
import { timestampToMillis } from '../../utils/timestamp';
import { db } from './firebaseConfig';

const SCHEMA_VERSION = 1;
const FIRESTORE_BATCH_LIMIT = 450;

function tripSummariesCollection(uid, deviceId) {
  return collection(db, 'users', uid, 'devices', deviceId, 'tripSummaries');
}

function tripSummaryDoc(uid, deviceId, tripId) {
  return doc(db, 'users', uid, 'devices', deviceId, 'tripSummaries', tripId);
}

function gpsChunksCollection(uid, deviceId, tripId) {
  return collection(
    db,
    'users',
    uid,
    'devices',
    deviceId,
    'tripSummaries',
    tripId,
    'gpsChunks'
  );
}

function gpsChunkDoc(uid, deviceId, tripId, chunkId) {
  return doc(
    db,
    'users',
    uid,
    'devices',
    deviceId,
    'tripSummaries',
    tripId,
    'gpsChunks',
    chunkId
  );
}

function createCloudHistoryError(action, error) {
  return new Error(`Failed to ${action} cloud trip history. ${error.message}`);
}

function chunkIdForIndex(index) {
  return `chunk_${String(index).padStart(4, '0')}`;
}

function normalizeTimestampFields(data) {
  return {
    ...data,
    startTime: timestampToMillis(data.startTime),
    endTime: timestampToMillis(data.endTime),
    createdAt: timestampToMillis(data.createdAt),
    updatedAt: timestampToMillis(data.updatedAt),
    uploadedAt: timestampToMillis(data.uploadedAt),
  };
}

function sanitizeNumber(value, fallback = null) {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizePlaybackPoint(point) {
  const timestamp = timestampToMillis(point?.timestamp);

  return {
    latitude: sanitizeNumber(point?.latitude),
    longitude: sanitizeNumber(point?.longitude),
    speedKmh: sanitizeNumber(point?.speedKmh, 0),
    heading: sanitizeNumber(point?.heading),
    accuracy: sanitizeNumber(point?.accuracy),
    altitude: sanitizeNumber(point?.altitude),
    timestamp,
  };
}

function isValidPlaybackPoint(point) {
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

function isPointWithinTripBounds(point, trip) {
  const startTime = timestampToMillis(trip?.startTime);
  const endTime = timestampToMillis(trip?.endTime);

  return (
    (!Number.isFinite(startTime) || point.timestamp >= startTime) &&
    (!Number.isFinite(endTime) || point.timestamp <= endTime)
  );
}

function sanitizePlaybackPoints(points, trip = null) {
  return (Array.isArray(points) ? points : [])
    .map(sanitizePlaybackPoint)
    .filter(isValidPlaybackPoint)
    .filter((point) => !trip || isPointWithinTripBounds(point, trip))
    .sort((pointA, pointB) => pointA.timestamp - pointB.timestamp);
}

function sanitizeTripSummary(uid, deviceId, trip, gpsPointCount = trip.gpsPointCount ?? 0) {
  return {
    id: trip.id,
    tripId: trip.id,
    userId: uid,
    deviceId,
    date: trip.date ?? null,
    startTime: timestampToMillis(trip.startTime),
    endTime: timestampToMillis(trip.endTime),
    durationMs: sanitizeNumber(trip.durationMs, 0),
    totalDistanceKm: sanitizeNumber(trip.totalDistanceKm, 0),
    avgSpeedKmh: sanitizeNumber(trip.avgSpeedKmh, 0),
    maxSpeedKmh: sanitizeNumber(trip.maxSpeedKmh, 0),
    startLatitude: sanitizeNumber(trip.startLatitude),
    startLongitude: sanitizeNumber(trip.startLongitude),
    endLatitude: sanitizeNumber(trip.endLatitude),
    endLongitude: sanitizeNumber(trip.endLongitude),
    startAddress: trip.startAddress ?? null,
    endAddress: trip.endAddress ?? null,
    gpsPointCount,
    status: trip.status ?? 'completed',
    createdAt: timestampToMillis(trip.createdAt),
    updatedAt: timestampToMillis(trip.updatedAt),
    uploadedAt: serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
  };
}

async function deleteExistingChunks(uid, deviceId, tripId) {
  const snapshot = await getDocs(gpsChunksCollection(uid, deviceId, tripId));

  if (snapshot.empty) {
    return 0;
  }

  for (let index = 0; index < snapshot.docs.length; index += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunkSnapshots = snapshot.docs.slice(index, index + FIRESTORE_BATCH_LIMIT);

    chunkSnapshots.forEach((chunkSnapshot) => {
      batch.delete(chunkSnapshot.ref);
    });
    await batch.commit();
  }

  return snapshot.docs.length;
}

export async function uploadTripSummary(uid, deviceId, trip) {
  try {
    const summary = sanitizeTripSummary(uid, deviceId, trip);
    await setDoc(tripSummaryDoc(uid, deviceId, trip.id), summary, {
      merge: true,
    });
    return summary;
  } catch (error) {
    throw createCloudHistoryError('upload trip summary', error);
  }
}

export async function uploadTripGpsChunks(uid, deviceId, tripId, points) {
  try {
    const sanitizedPoints = sanitizePlaybackPoints(points);

    await deleteExistingChunks(uid, deviceId, tripId);

    if (sanitizedPoints.length === 0) {
      return [];
    }

    const chunks = [];

    for (let index = 0; index < sanitizedPoints.length; index += GPS_POINTS_PER_CHUNK) {
      const chunkPoints = sanitizedPoints.slice(index, index + GPS_POINTS_PER_CHUNK);
      const chunkIndex = chunks.length;
      const chunk = {
        chunkIndex,
        pointCount: chunkPoints.length,
        startTimestamp: chunkPoints[0]?.timestamp ?? null,
        endTimestamp: chunkPoints[chunkPoints.length - 1]?.timestamp ?? null,
        points: chunkPoints,
        createdAt: serverTimestamp(),
        schemaVersion: SCHEMA_VERSION,
      };

      chunks.push({
        id: chunkIdForIndex(chunkIndex),
        ...chunk,
      });
    }

    for (let index = 0; index < chunks.length; index += FIRESTORE_BATCH_LIMIT) {
      const batch = writeBatch(db);
      const batchChunks = chunks.slice(index, index + FIRESTORE_BATCH_LIMIT);

      batchChunks.forEach((chunk) => {
        batch.set(gpsChunkDoc(uid, deviceId, tripId, chunk.id), chunk);
      });
      await batch.commit();
    }

    return chunks;
  } catch (error) {
    throw createCloudHistoryError('upload GPS chunks', error);
  }
}

export async function uploadCompletedTrip(uid, deviceId, trip, points) {
  try {
    if (trip.status !== 'completed') {
      throw new Error('Only completed trips can be uploaded.');
    }

    const boundedPoints = sanitizePlaybackPoints(points, trip);
    const summary = await uploadTripSummary(uid, deviceId, {
      ...trip,
      gpsPointCount: boundedPoints.length,
    });
    const chunks = await uploadTripGpsChunks(
      uid,
      deviceId,
      trip.id,
      boundedPoints
    );

    await setDoc(
      tripSummaryDoc(uid, deviceId, trip.id),
      {
        gpsPointCount: boundedPoints.length,
        uploadedAt: serverTimestamp(),
        updatedAt: timestampToMillis(trip.updatedAt) ?? Date.now(),
        schemaVersion: SCHEMA_VERSION,
      },
      { merge: true }
    );

    return { summary, chunks };
  } catch (error) {
    throw createCloudHistoryError('upload completed trip', error);
  }
}

export async function listCloudTripSummaries(uid, deviceId, options = {}) {
  try {
    const pageSize = options.limit ?? REMOTE_HISTORY_PAGE_SIZE;
    const summariesQuery = query(
      tripSummariesCollection(uid, deviceId),
      orderBy('startTime', 'desc'),
      firestoreLimit(pageSize)
    );
    const snapshot = await getDocs(summariesQuery);

    return snapshot.docs.map((summarySnapshot) => ({
      id: summarySnapshot.id,
      ...normalizeTimestampFields(summarySnapshot.data()),
    }));
  } catch (error) {
    throw createCloudHistoryError('list trip summaries', error);
  }
}

export async function getCloudTripSummary(uid, deviceId, tripId) {
  try {
    const snapshot = await getDoc(tripSummaryDoc(uid, deviceId, tripId));

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...normalizeTimestampFields(snapshot.data()),
    };
  } catch (error) {
    throw createCloudHistoryError('get trip summary', error);
  }
}

export async function listCloudTripGpsChunks(uid, deviceId, tripId) {
  try {
    const chunksQuery = query(
      gpsChunksCollection(uid, deviceId, tripId),
      orderBy('chunkIndex', 'asc')
    );
    const snapshot = await getDocs(chunksQuery);

    return snapshot.docs.map((chunkSnapshot) => ({
      id: chunkSnapshot.id,
      ...chunkSnapshot.data(),
    }));
  } catch (error) {
    throw createCloudHistoryError('list GPS chunks', error);
  }
}

export async function getCloudTripPlayback(uid, deviceId, tripId) {
  const trip = await getCloudTripSummary(uid, deviceId, tripId);

  if (!trip) {
    return null;
  }

  const chunks = await listCloudTripGpsChunks(uid, deviceId, tripId);
  const seen = new Set();
  const gpsPoints = chunks
    .flatMap((chunk) => (Array.isArray(chunk.points) ? chunk.points : []))
    .map(sanitizePlaybackPoint)
    .filter(isValidPlaybackPoint)
    .filter((point) => {
      const withinBounds =
        (!Number.isFinite(trip.startTime) || point.timestamp >= trip.startTime) &&
        (!Number.isFinite(trip.endTime) || point.timestamp <= trip.endTime);
      const key = `${point.timestamp}:${point.latitude}:${point.longitude}`;

      if (!withinBounds || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((pointA, pointB) => pointA.timestamp - pointB.timestamp);

  return {
    trip,
    gpsPoints,
    chunks,
  };
}
