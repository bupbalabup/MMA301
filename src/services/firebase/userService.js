import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from './firebaseConfig';

function userDoc(uid) {
  return doc(db, 'users', uid);
}

function createUserError(action, error) {
  return new Error(`Failed to ${action} user profile. ${error.message}`);
}

export async function createUserProfile(uid, data) {
  try {
    const profile = {
      uid,
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userDoc(uid), profile, { merge: true });
    return profile;
  } catch (error) {
    throw createUserError('create', error);
  }
}

export async function ensureUserProfile(uid, data) {
  const existingProfile = await getUserProfile(uid);
  if (existingProfile) {
    return existingProfile;
  }

  return createUserProfile(uid, data);
}

export async function getUserProfile(uid) {
  try {
    const snapshot = await getDoc(userDoc(uid));

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  } catch (error) {
    throw createUserError('get', error);
  }
}

export async function updateUserProfile(uid, data) {
  try {
    const updates = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(userDoc(uid), updates);
    return updates;
  } catch (error) {
    throw createUserError('update', error);
  }
}
