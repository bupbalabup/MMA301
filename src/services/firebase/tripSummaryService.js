import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from './firebaseConfig';

function tripSummariesCollection(uid, deviceId) {
  return collection(db, 'users', uid, 'devices', deviceId, 'tripSummaries');
}

function tripSummaryDoc(uid, deviceId, tripId) {
  return doc(db, 'users', uid, 'devices', deviceId, 'tripSummaries', tripId);
}

function createTripSummaryError(action, error) {
  return new Error(`Failed to ${action} trip summary. ${error.message}`);
}

export async function createTripSummary(uid, deviceId, tripId, data) {
  try {
    const summary = {
      tripId,
      userId: uid,
      deviceId,
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(tripSummaryDoc(uid, deviceId, tripId), summary, {
      merge: true,
    });
    return summary;
  } catch (error) {
    throw createTripSummaryError('create', error);
  }
}

export async function updateTripSummary(uid, deviceId, tripId, data) {
  try {
    const updates = {
      userId: uid,
      deviceId,
      ...data,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(tripSummaryDoc(uid, deviceId, tripId), updates);
    return updates;
  } catch (error) {
    throw createTripSummaryError('update', error);
  }
}

export async function getTripSummary(uid, deviceId, tripId) {
  try {
    const snapshot = await getDoc(tripSummaryDoc(uid, deviceId, tripId));

    if (!snapshot.exists()) {
      return null;
    }

    const summary = snapshot.data();

    if (summary.userId !== uid || summary.deviceId !== deviceId) {
      throw new Error('Trip summary does not belong to the requested user and device.');
    }

    return {
      id: snapshot.id,
      ...summary,
    };
  } catch (error) {
    throw createTripSummaryError('get', error);
  }
}

export async function listTripSummaries(uid, deviceId) {
  try {
    const summariesQuery = query(
      tripSummariesCollection(uid, deviceId),
      orderBy('startTime', 'desc')
    );

    const snapshot = await getDocs(summariesQuery);

    return snapshot.docs.map((summaryDoc) => ({
      id: summaryDoc.id,
      ...summaryDoc.data(),
    }));
  } catch (error) {
    throw createTripSummaryError('list', error);
  }
}

