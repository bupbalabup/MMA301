import { getApps, initializeApp } from 'firebase/app';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missingEnv = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnv.length > 0) {
  throw new Error(
    `Thiếu cấu hình Firebase trong bản build: ${missingEnv.join(', ')}`
  );
}

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp(firebaseConfig);

function isAuthAlreadyInitializedError(error) {
  return (
    error?.code === 'auth/already-initialized' ||
    error?.message?.includes('already initialized') ||
    error?.message?.includes('already been initialized')
  );
}

function initializeFirebaseAuth(appInstance) {
  const persistence =
    getReactNativePersistence(ReactNativeAsyncStorage);

  try {
    return initializeAuth(appInstance, { persistence });
  } catch (error) {
    if (isAuthAlreadyInitializedError(error)) {
      return getAuth(appInstance);
    }

    throw error;
  }
}

export const auth = initializeFirebaseAuth(app);
export const db = getFirestore(app);
export default app;