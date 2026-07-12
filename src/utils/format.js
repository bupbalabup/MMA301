/**
 * Track Device Shared Format Utilities
 *
 * Screens should use these helpers instead of rendering raw database,
 * Firebase, or tracking status values directly.
 */

export const EMPTY_VALUE = 'Chưa có dữ liệu';

function toFiniteNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

/**
 * Formats a speed value as a rounded km/h string.
 * @param {number|null|undefined} value
 * @param {{emptyForInvalid?: boolean}} options
 * @returns {string}
 */
export function formatSpeed(value, options = {}) {
  const speed = toFiniteNumber(value);

  if (speed == null || speed < 0) {
    return options.emptyForInvalid ? EMPTY_VALUE : '0 km/h';
  }

  return `${Math.round(speed)} km/h`;
}

/**
 * Formats a distance in km. Very short non-zero trips are shown in meters.
 * @param {number|null|undefined} value
 * @returns {string}
 */
export function formatDistance(value) {
  const distance = toFiniteNumber(value) ?? 0;

  if (distance > 0 && distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }

  return `${distance.toFixed(2)} km`;
}

/**
 * Formats a duration in milliseconds into HH:MM:SS.
 * @param {number|null|undefined} durationMs
 * @returns {string}
 */
export function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.floor((toFiniteNumber(durationMs) ?? 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}

/**
 * Formats a duration in milliseconds into concise Vietnamese.
 * @param {number|null|undefined} durationMs
 * @returns {string}
 */
export function formatDurationHuman(durationMs) {
  const totalSeconds = Math.max(0, Math.round((toFiniteNumber(durationMs) ?? 0) / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds} giây`;
  }

  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} giờ ${minutes} phút`;
  }

  if (hours > 0) {
    return `${hours} giờ`;
  }

  return `${minutes} phút`;
}

export function formatStoppedDuration(durationMs) {
  const totalMs = toFiniteNumber(durationMs);

  if (totalMs == null || totalMs < 0) {
    return EMPTY_VALUE;
  }

  const totalMinutes = Math.floor(totalMs / 60000);
  if (totalMinutes < 1) {
    return 'Dưới 1 phút';
  }

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days} ngày ${hours} giờ` : `${days} ngày`;
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  }

  return `${minutes} phút`;
}

export function formatLostConnectionDuration(durationMs) {
  const totalMs = toFiniteNumber(durationMs);

  if (totalMs == null || totalMs < 0) {
    return EMPTY_VALUE;
  }

  const totalMinutes = Math.floor(totalMs / 60000);
  if (totalMinutes < 1) {
    return 'Vừa mất kết nối';
  }

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0
      ? `${days} ngày ${hours} giờ trước`
      : `${days} ngày trước`;
  }

  if (hours > 0) {
    return minutes > 0
      ? `${hours} giờ ${minutes} phút trước`
      : `${hours} giờ trước`;
  }

  return `${minutes} phút trước`;
}

/**
 * Formats a duration in milliseconds into a short playback label.
 * @param {number|null|undefined} durationMs
 * @returns {string}
 */
export function formatDurationPlayback(durationMs) {
  const totalSeconds = Math.max(0, Math.round((toFiniteNumber(durationMs) ?? 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }

  if (minutes > 0) {
    return `${minutes} phút ${seconds} giây`;
  }

  return `${seconds} giây`;
}

/**
 * Maps an internal status key to a Vietnamese display label.
 * @param {string|null|undefined} status
 * @returns {string}
 */
export function formatStatus(status) {
  const key = typeof status === 'string' ? status.trim() : status;
  const labels = {
    active: 'Đang chạy',
    ACTIVE: 'Đang chạy',
    completed: 'Đã hoàn thành',
    COMPLETED: 'Đã hoàn thành',
    interrupted: 'Bị gián đoạn',
    INTERRUPTED: 'Bị gián đoạn',
    pending: 'Chờ đồng bộ',
    PENDING: 'Chờ đồng bộ',
    syncing: 'Đang đồng bộ',
    SYNCING: 'Đang đồng bộ',
    synced: 'Đã đồng bộ',
    SYNCED: 'Đã đồng bộ',
    failed: 'Đồng bộ thất bại',
    FAILED: 'Đồng bộ thất bại',
    Moving: 'Đang di chuyển',
    moving: 'Đang di chuyển',
    Paused: 'Tạm dừng',
    paused: 'Tạm dừng',
    Parking: 'Đỗ xe',
    parking: 'Đỗ xe',
    Offline: 'Mất kết nối',
    offline: 'Mất kết nối',
    'GPS Lost': 'Mất GPS',
    Idle: 'Không hoạt động',
    idle: 'Không hoạt động',
    Online: 'Trực tuyến',
    online: 'Trực tuyến',
  };

  return labels[key] ?? EMPTY_VALUE;
}

export function formatTripStatus(status) {
  return formatStatus(status);
}

export function formatSyncStatus(status) {
  return formatStatus(status ?? 'pending');
}

/**
 * Formats a YYYY-MM-DD date key or epoch timestamp as dd/MM/yyyy.
 * @param {string|number|null|undefined} dateKeyOrTimestamp
 * @returns {string}
 */
export function formatDate(dateKeyOrTimestamp) {
  if (!dateKeyOrTimestamp) {
    return EMPTY_VALUE;
  }

  if (
    typeof dateKeyOrTimestamp === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateKeyOrTimestamp)
  ) {
    const [year, month, day] = dateKeyOrTimestamp.split('-');
    return `${day}/${month}/${year}`;
  }

  const timestamp = toFiniteNumber(dateKeyOrTimestamp);
  if (timestamp == null) {
    return EMPTY_VALUE;
  }

  return new Date(timestamp).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formats latitude/longitude into a readable coordinate string.
 * @param {number|null|undefined} latitude
 * @param {number|null|undefined} longitude
 * @returns {string}
 */
export function formatCoordinate(latitude, longitude) {
  if (latitude == null || longitude == null) {
    return 'Chưa có tọa độ';
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return 'Chưa có tọa độ';
  }

  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

/**
 * Formats a point object {latitude, longitude} into a coordinate string.
 * @param {{latitude: number, longitude: number}|null|undefined} point
 * @returns {string}
 */
export function formatPointCoordinate(point) {
  if (!point) {
    return 'Chưa có tọa độ';
  }

  return formatCoordinate(point.latitude, point.longitude);
}

/**
 * Formats a timestamp (ms) into HH:mm.
 * @param {number|null|undefined} timestamp
 * @returns {string}
 */
export function formatTime(timestamp) {
  const timestampMs = toFiniteNumber(timestamp);
  if (timestampMs == null) {
    return '--:--';
  }

  return new Date(timestampMs).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats a timestamp (ms) into HH:mm dd/MM/yyyy.
 * @param {number|null|undefined} timestamp
 * @returns {string}
 */
export function formatDateTime(timestamp) {
  const timestampMs = toFiniteNumber(timestamp);
  if (timestampMs == null) {
    return EMPTY_VALUE;
  }

  const date = new Date(timestampMs);
  const timeText = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateText = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `${timeText} ${dateText}`;
}

/**
 * Formats a timestamp (ms) into HH:mm:ss.
 * @param {number|null|undefined} timestamp
 * @returns {string}
 */
export function formatLastUpdate(timestamp) {
  const timestampMs = toFiniteNumber(timestamp);
  if (timestampMs == null) {
    return EMPTY_VALUE;
  }

  return new Date(timestampMs).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Formats a timestamp (ms) into HH:mm:ss string for playback.
 * @param {number|null|undefined} timestamp
 * @returns {string}
 */
export function formatTimeWithSeconds(timestamp) {
  const timestampMs = toFiniteNumber(timestamp);
  if (timestampMs == null) {
    return '--:--:--';
  }

  return new Date(timestampMs).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Formats playback elapsed time as mm:ss or H:mm:ss.
 * @param {number|null|undefined} durationMs
 * @returns {string}
 */
export function formatPlaybackClock(durationMs) {
  const totalSeconds = Math.max(0, Math.floor((toFiniteNumber(durationMs) ?? 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Returns an address or coordinates fallback.
 * @param {string|null|undefined} address
 * @param {number|null|undefined} latitude
 * @param {number|null|undefined} longitude
 * @returns {string}
 */
export function formatLocation(address, latitude, longitude) {
  if (address) {
    return address;
  }

  return formatCoordinate(latitude, longitude);
}

/**
 * Extracts a display name from a device object.
 * Technical IDs are intentionally excluded from normal display titles.
 * @param {object|null|undefined} device
 * @returns {string|undefined}
 */
export function getDeviceName(device) {
  return (
    device?.name ??
    device?.deviceName ??
    device?.platformLabel ??
    'Thiết bị'
  );
}

/**
 * Returns a boolean permission value as a readable Vietnamese label.
 * @param {boolean|null|undefined} value
 * @returns {string}
 */
export function formatBooleanStatus(value) {
  if (value === true) {
    return 'Bật';
  }

  if (value === false) {
    return 'Chưa bật';
  }

  return 'Không xác định';
}

/**
 * Returns permission granted status as a readable Vietnamese label.
 * @param {{granted: boolean}|null|undefined} permission
 * @param {boolean} required
 * @returns {string}
 */
export function formatPermission(permission, required = true) {
  if (!required) {
    return 'Không cần cấp quyền trên Android này';
  }

  if (!permission) {
    return 'Chưa yêu cầu';
  }

  if (permission.granted) {
    return 'Bật';
  }

  if (permission.canAskAgain === false) {
    return 'Cần mở Cài đặt';
  }

  return 'Chưa cho phép';
}
