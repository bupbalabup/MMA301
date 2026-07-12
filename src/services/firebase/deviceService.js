import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from './firebaseConfig';

function deviceDoc(uid, deviceId) {
  return doc(db, 'users', uid, 'devices', deviceId);
}

function devicesCollection(uid) {
  return collection(db, 'users', uid, 'devices');
}

function createDeviceError(action, error) {
  return new Error(`Failed to ${action} device document. ${error.message}`);
}

function getDeviceDisplayName(device) {
  return device.name ?? device.deviceName ?? device.deviceId ?? device.id ?? '';
}

function sortDevices(deviceA, deviceB) {
  const nameComparison = getDeviceDisplayName(deviceA).localeCompare(
    getDeviceDisplayName(deviceB)
  );

  if (nameComparison !== 0) {
    return nameComparison;
  }

  const idA = deviceA.deviceId ?? deviceA.id ?? '';
  const idB = deviceB.deviceId ?? deviceB.id ?? '';
  return idA.localeCompare(idB);
}

export async function createOrUpdateDevice(uid, deviceId, data) {
  try {
    const snapshot = await getDoc(deviceDoc(uid, deviceId));
    const device = {
      id: deviceId,
      deviceId,
      userId: uid,
      ...data,
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    };

    if (!snapshot.exists()) {
      device.createdAt = serverTimestamp();
    }

    await setDoc(deviceDoc(uid, deviceId), device, { merge: true });

    return device;
  } catch (error) {
    throw createDeviceError('create or update', error);
  }
}

export async function listDevices(uid) {
  try {
    const snapshot = await getDocs(devicesCollection(uid));

    return snapshot.docs
      .map((deviceSnapshot) => ({
        id: deviceSnapshot.id,
        ...deviceSnapshot.data(),
      }))
      .sort(sortDevices);
  } catch (error) {
    throw createDeviceError('list', error);
  }
}

export function subscribeToDevices(uid, callback) {
  try {
    return onSnapshot(
      devicesCollection(uid),
      (snapshot) => {
        const devices = snapshot.docs
          .map((deviceSnapshot) => ({
            id: deviceSnapshot.id,
            ...deviceSnapshot.data(),
          }))
          .sort(sortDevices);

        callback(devices);
      },
      (error) => {
        callback([], createDeviceError('subscribe to', error));
      }
    );
  } catch (error) {
    throw createDeviceError('subscribe to', error);
  }
}

export async function getDevice(uid, deviceId) {
  try {
    const snapshot = await getDoc(deviceDoc(uid, deviceId));

    if (!snapshot.exists()) {
      return null;
    }

    const device = snapshot.data();

    if (device.userId !== uid) {
      throw new Error('Device does not belong to the requested user.');
    }

    return {
      id: snapshot.id,
      ...device,
    };
  } catch (error) {
    throw createDeviceError('get', error);
  }
}

export async function updateDeviceStatus(uid, deviceId, status) {
  try {
    const updates = {
      userId: uid,
      status,
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    };

    await updateDoc(deviceDoc(uid, deviceId), updates);
    return updates;
  } catch (error) {
    throw createDeviceError('update status for', error);
  }
}

export async function updateDevice(uid, deviceId, data) {
  try {
    const updates = {
      ...data,
      userId: uid,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(deviceDoc(uid, deviceId), updates);
    return updates;
  } catch (error) {
    throw createDeviceError('update', error);
  }
}
