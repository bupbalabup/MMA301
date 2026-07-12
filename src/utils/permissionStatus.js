export const PERMISSION_LABELS = {
  batteryIgnored: 'Đã tắt tối ưu pin',
  batteryOptimized: 'Đang bị tối ưu pin',
  blocked: 'Cần mở Cài đặt',
  checking: 'Đang kiểm tra',
  disabled: 'Tắt',
  enabled: 'Bật',
  error: 'Không thể kiểm tra',
  manualCheck: 'Cần kiểm tra thủ công',
  notRequested: 'Chưa yêu cầu',
  notificationNotRequired: 'Không cần cấp quyền trên Android này',
  openedUnverified: 'Đã mở cài đặt - chưa xác minh',
  unsupported: 'Không hỗ trợ',
  userConfirmed: 'Đã được người dùng xác nhận',
};

export function normalizeLocationPermission(permission, options = {}) {
  if (options.checking) {
    return { key: 'checking', label: PERMISSION_LABELS.checking, verified: false };
  }

  if (options.unsupported) {
    return { key: 'unsupported', label: PERMISSION_LABELS.unsupported, verified: false };
  }

  if (options.error || permission?.error) {
    return { key: 'error', label: PERMISSION_LABELS.error, verified: false };
  }

  if (!permission) {
    return { key: 'not_requested', label: PERMISSION_LABELS.notRequested, verified: false };
  }

  if (permission.granted || permission.status === 'granted') {
    return { key: 'granted', label: PERMISSION_LABELS.enabled, verified: true };
  }

  if (permission.status === 'undetermined') {
    return { key: 'undetermined', label: PERMISSION_LABELS.notRequested, verified: false };
  }

  if (permission.canAskAgain === false) {
    return { key: 'blocked', label: PERMISSION_LABELS.blocked, verified: false };
  }

  return { key: 'denied', label: 'Chưa cho phép', verified: false };
}

export function normalizeLocationServices(enabled, options = {}) {
  if (options.checking) {
    return { key: 'checking', label: PERMISSION_LABELS.checking, verified: false };
  }

  if (options.error) {
    return { key: 'error', label: PERMISSION_LABELS.error, verified: false };
  }

  if (enabled === true) {
    return { key: 'enabled', label: PERMISSION_LABELS.enabled, verified: true };
  }

  if (enabled === false) {
    return { key: 'disabled', label: PERMISSION_LABELS.disabled, verified: false };
  }

  return { key: 'error', label: PERMISSION_LABELS.error, verified: false };
}

export function normalizeNotificationPermission(permission, options = {}) {
  if (options.checking) {
    return { key: 'checking', label: PERMISSION_LABELS.checking, verified: false };
  }

  if (permission?.required === false) {
    return {
      key: 'not_required',
      label: PERMISSION_LABELS.notificationNotRequired,
      verified: true,
    };
  }

  if (permission?.blocked) {
    return { key: 'blocked', label: PERMISSION_LABELS.blocked, verified: false };
  }

  if (permission?.granted) {
    return { key: 'granted', label: PERMISSION_LABELS.enabled, verified: true };
  }

  if (permission?.error) {
    return { key: 'error', label: PERMISSION_LABELS.error, verified: false };
  }

  return { key: 'denied', label: 'Chưa cho phép', verified: false };
}

export function normalizeAutoStartStatus(status = {}) {
  if (status.userConfirmedAt) {
    return {
      key: 'user_confirmed',
      label: PERMISSION_LABELS.userConfirmed,
      verified: false,
      manual: true,
    };
  }

  if (status.openedAt) {
    return {
      key: 'opened_unverified',
      label: PERMISSION_LABELS.openedUnverified,
      verified: false,
      manual: true,
    };
  }

  if (status.available === false) {
    return {
      key: 'not_available',
      label: 'Không có mục tự khởi động',
      verified: false,
      manual: true,
    };
  }

  return {
    key: 'manual_check',
    label: PERMISSION_LABELS.manualCheck,
    verified: false,
    manual: true,
  };
}

export function normalizeBatteryOptimizationStatus(status = {}) {
  if (status.checking) {
    return { key: 'checking', label: PERMISSION_LABELS.checking, verified: false };
  }

  if (status.ignoringBatteryOptimizations === true) {
    return {
      key: 'ignored',
      label: PERMISSION_LABELS.batteryIgnored,
      verified: true,
    };
  }

  if (status.ignoringBatteryOptimizations === false) {
    return {
      key: 'optimized',
      label: PERMISSION_LABELS.batteryOptimized,
      verified: true,
    };
  }

  return { key: 'error', label: PERMISSION_LABELS.error, verified: false };
}

export function getStatusTone(normalizedStatus) {
  const key = normalizedStatus?.key;

  if (['granted', 'enabled', 'not_required', 'ignored'].includes(key)) {
    return 'Online';
  }

  if (['checking', 'manual_check', 'opened_unverified', 'user_confirmed'].includes(key)) {
    return 'Idle';
  }

  return 'Offline';
}
