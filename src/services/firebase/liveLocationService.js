import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { db } from './firebaseConfig';

function liveLocationDoc(uid, deviceId) {
  return doc(db, 'users', uid, 'devices', deviceId, 'liveLocation', 'current');
}

function createLiveLocationError(action, error) {
  return new Error(`Failed to ${action} live location. ${error.message}`);
}

export async function updateLiveLocation(uid, deviceId, locationData) {
  try {
    const liveLocation = {
      id: 'current',
      userId: uid,
      deviceId,
      ...locationData,
      updatedAt: serverTimestamp(),
    };

    await setDoc(liveLocationDoc(uid, deviceId), liveLocation, { merge: true });
    return liveLocation;
  } catch (error) {
    throw createLiveLocationError('update', error);
  }
}

export async function getLiveLocation(uid, deviceId) {
  try {
    const snapshot = await getDoc(liveLocationDoc(uid, deviceId));

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  } catch (error) {
    throw createLiveLocationError('get', error);
  }
}

export function subscribeToLiveLocation(uid, deviceId, callback) {
  try {
    return onSnapshot(
      liveLocationDoc(uid, deviceId),
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }

        callback({
          id: snapshot.id,
          ...snapshot.data(),
        });
      },
      (error) => {
        callback(null, createLiveLocationError('subscribe to', error));
      }
    );
  } catch (error) {
    throw createLiveLocationError('subscribe to', error);
  }
}
