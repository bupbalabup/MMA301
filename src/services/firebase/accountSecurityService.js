import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import { db } from './firebaseConfig';
import { normalizeHexColor } from '../../utils/color';

function userDoc(uid) {
  return doc(db, 'users', uid);
}

function deviceDoc(uid, deviceId) {
  return doc(db, 'users', uid, 'devices', deviceId);
}

function devicesCollection(uid) {
  return collection(db, 'users', uid, 'devices');
}

function securityLogsCollection(uid) {
  return collection(db, 'users', uid, 'securityLogs');
}

export const SECURITY_ACTIONS = {
  ADD_DEVICE: 'add_device',
  CHANGE_PASSWORD: 'change_password',
  DELETE_DEVICE: 'delete_device',
  KICK_DEVICE: 'kick_device',
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGOUT_ALL: 'logout_all',
  RENAME_DEVICE: 'rename_device',
  UPDATE_DEVICE_MARKER: 'update_device_marker',
};

export async function logSecurityEvent(uid, data) {
  if (!uid) {
    return null;
  }

  const log = {
    action: data.action,
    deviceId: data.deviceId ?? null,
    deviceName: data.deviceName ?? null,
    platform: data.platform ?? null,
    targetDeviceId: data.targetDeviceId ?? null,
    targetDeviceName: data.targetDeviceName ?? null,
    createdAt: serverTimestamp(),
    metadata: data.metadata ?? null,
  };

  const ref = await addDoc(securityLogsCollection(uid), log);
  return { id: ref.id, ...log };
}

export async function listSecurityLogs(uid, resultLimit = 50) {
  if (!uid) {
    return [];
  }

  const logsQuery = query(
    securityLogsCollection(uid),
    orderBy('createdAt', 'desc'),
    limit(resultLimit)
  );
  const snapshot = await getDocs(logsQuery);

  return snapshot.docs.map((logSnapshot) => ({
    id: logSnapshot.id,
    ...logSnapshot.data(),
  }));
}

export async function updateUserAccountProfile(uid, data) {
  const updates = {
    displayName: data.displayName,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(userDoc(uid), updates);
  return updates;
}

export async function updateDevicePreferences(uid, deviceId, data) {
  const updates = {
    updatedAt: serverTimestamp(),
  };

  if (data.name !== undefined) {
    updates.name = data.name;
    updates.deviceName = data.name;
  }

  if (data.markerColor !== undefined) {
    const normalizedMarkerColor = normalizeHexColor(data.markerColor);
    if (!normalizedMarkerColor) {
      throw new Error('Invalid marker color.');
    }
    updates.markerColor = normalizedMarkerColor;
  }

  await updateDoc(deviceDoc(uid, deviceId), updates);
  return updates;
}

export async function softDeleteDevice(uid, deviceId) {
  const updates = {
    deletedAt: serverTimestamp(),
    status: 'deleted',
    trackingEnabled: false,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(deviceDoc(uid, deviceId), updates);
  return updates;
}

export async function revokeDeviceSession(uid, deviceId, reason = 'user_requested') {
  const updates = {
    sessionRevokedAt: serverTimestamp(),
    sessionRevokedReason: reason,
    sessionStatus: 'revoked',
    updatedAt: serverTimestamp(),
  };

  await updateDoc(deviceDoc(uid, deviceId), updates);
  return updates;
}

export async function revokeAllDeviceSessions(uid, reason = 'logout_all') {
  const snapshot = await getDocs(devicesCollection(uid));
  const batch = writeBatch(db);

  snapshot.docs.forEach((deviceSnapshot) => {
    batch.update(deviceSnapshot.ref, {
      sessionRevokedAt: serverTimestamp(),
      sessionRevokedReason: reason,
      sessionStatus: 'revoked',
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return snapshot.docs.length;
}
