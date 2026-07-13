import { Platform } from 'react-native';

import { LIVE_TRACKING_NOTIFICATION } from '../../constants/notification';
import { TRACKING_STATUS } from '../../constants/tracking';
import { updateAndroidForegroundServiceNotification } from '../location/locationTaskService';

const CONNECTION_STATUS = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
};

const movementLabels = {
  [TRACKING_STATUS.MOVING]: 'Đang di chuyển',
  [TRACKING_STATUS.PAUSED]: 'Tạm dừng',
  [TRACKING_STATUS.PARKING]: 'Đỗ xe',
  [TRACKING_STATUS.GPS_LOST]: 'Mất GPS',
  [TRACKING_STATUS.IDLE]: 'Không hoạt động',
};

let lastVisibleKey = null;
let lastLocationOptions = null;

function getSafeDeviceName(deviceName) {
  const trimmedName = typeof deviceName === 'string' ? deviceName.trim() : '';
  return trimmedName || 'Thiết bị Android';
}

function getConnectionLabel(connectionStatus) {
  return connectionStatus === CONNECTION_STATUS.OFFLINE
    ? 'Mất kết nối'
    : 'Trực tuyến';
}

function getMovementLabel(movementStatus) {
  return movementLabels[movementStatus] ?? movementLabels[TRACKING_STATUS.IDLE];
}

export function buildLiveTrackingNotificationContent({
  connectionStatus,
  deviceName,
  movementStatus,
  speedKmh,
}) {
  const roundedSpeed = Math.max(0, Math.round(Number(speedKmh) || 0));
  const isOffline = connectionStatus === CONNECTION_STATUS.OFFLINE;
  const title = `${LIVE_TRACKING_NOTIFICATION.TITLE_PREFIX} - ${getSafeDeviceName(deviceName)}`;
  const speedText = isOffline
    ? `Tốc độ gần nhất ${roundedSpeed} km/h`
    : `${roundedSpeed} km/h`;
  const body = [
    speedText,
    getConnectionLabel(connectionStatus),
    getMovementLabel(movementStatus),
  ].join(' | ');

  return {
    body,
    key: `${title}|${body}`,
    title,
  };
}

export function buildForegroundServiceOptions(content) {
  return {
    killServiceOnDestroy: false,
    notificationBody: content.body,
    notificationColor: LIVE_TRACKING_NOTIFICATION.NOTIFICATION_COLOR,
    notificationTitle: content.title,
  };
}

export function rememberNotificationLocationOptions(options = {}) {
  lastLocationOptions = options;
}

export function resetLiveTrackingNotificationCache() {
  lastVisibleKey = null;
}

export function rememberVisibleLiveTrackingNotification(content) {
  lastVisibleKey = content?.key ?? null;
}

export async function updateLiveTrackingForegroundNotification({
  connectionStatus,
  deviceName,
  force = false,
  movementStatus,
  speedKmh,
}) {
  if (Platform.OS !== 'android') {
    return false;
  }

  const content = buildLiveTrackingNotificationContent({
    connectionStatus,
    deviceName,
    movementStatus,
    speedKmh,
  });
  if (!force && content.key === lastVisibleKey) {
    return false;
  }

  if (__DEV__) {
    console.log('[BG_NOTIFICATION] visible key changed', {
      body: content.body,
      title: content.title,
    });
  }

  const updated = await updateAndroidForegroundServiceNotification(
    lastLocationOptions ?? {},
    buildForegroundServiceOptions(content)
  );

  if (updated) {
    lastVisibleKey = content.key;
  } else if (__DEV__) {
    console.warn('[BG_NOTIFICATION] foreground notification update was not applied');
  }

  return updated;
}
