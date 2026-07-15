import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

import { clearTrackingData } from '../../database';
import { clearDisplayCache } from '../cache/liveDataCacheService';
import { clearTrackingTaskState } from '../tracking/trackingTaskStateService';
import { deleteCurrentUserAuthentication, getCurrentUser } from './authService';
import { db } from './firebaseConfig';

const FIRESTORE_DELETE_BATCH_SIZE = 400;
const SELECTED_DEVICE_STORAGE_PREFIX = 'trackcam.selectedDeviceId';
const SELECTED_HISTORY_DEVICE_STORAGE_PREFIX =
  'trackcam.selectedHistoryDeviceId';

async function deleteSnapshotDocuments(snapshot) {
  for (
    let index = 0;
    index < snapshot.docs.length;
    index += FIRESTORE_DELETE_BATCH_SIZE
  ) {
    const batch = writeBatch(db);
    snapshot.docs
      .slice(index, index + FIRESTORE_DELETE_BATCH_SIZE)
      .forEach((documentSnapshot) => batch.delete(documentSnapshot.ref));
    await batch.commit();
  }
}

async function deleteDeviceHistory(uid, deviceId) {
  const summaries = await getDocs(
    collection(db, 'users', uid, 'devices', deviceId, 'tripSummaries')
  );

  for (const summary of summaries.docs) {
    const chunks = await getDocs(
      collection(
        db,
        'users',
        uid,
        'devices',
        deviceId,
        'tripSummaries',
        summary.id,
        'gpsChunks'
      )
    );
    await deleteSnapshotDocuments(chunks);
  }

  await deleteSnapshotDocuments(summaries);
}

async function deleteDeviceData(uid, deviceId) {
  await deleteDeviceHistory(uid, deviceId);

  const liveLocations = await getDocs(
    collection(db, 'users', uid, 'devices', deviceId, 'liveLocation')
  );
  await deleteSnapshotDocuments(liveLocations);
  await deleteDoc(doc(db, 'users', uid, 'devices', deviceId));
}

async function deleteKnownCloudData(uid) {
  const devices = await getDocs(collection(db, 'users', uid, 'devices'));

  for (const device of devices.docs) {
    await deleteDeviceData(uid, device.id);
  }

  const securityLogs = await getDocs(
    collection(db, 'users', uid, 'securityLogs')
  );
  await deleteSnapshotDocuments(securityLogs);
  await deleteDoc(doc(db, 'users', uid));
}

async function clearKnownLocalData(uid) {
  await clearTrackingTaskState();
  await clearTrackingData();
  await Promise.all([
    clearDisplayCache(uid),
    AsyncStorage.removeItem(`${SELECTED_DEVICE_STORAGE_PREFIX}.${uid}`),
    AsyncStorage.removeItem(
      `${SELECTED_HISTORY_DEVICE_STORAGE_PREFIX}.${uid}`
    ),
  ]);
}

export async function deleteCurrentAccountData() {
  const user = getCurrentUser();
  const uid = user?.uid;

  if (!uid) {
    throw new Error('Không tìm thấy tài khoản đang đăng nhập.');
  }

  try {
    await deleteKnownCloudData(uid);
    await clearKnownLocalData(uid);
    await deleteCurrentUserAuthentication();
  } catch {
    throw new Error(
      'Không thể hoàn tất xóa tài khoản. Dữ liệu đã xóa sẽ không được tạo lại; hãy kết nối mạng ổn định và thử lại để xóa phần còn lại.'
    );
  }
}
