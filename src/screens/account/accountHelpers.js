import { APP_VERSION } from '../../constants/app';
import { EMPTY_VALUE, formatDateTime } from '../../utils/format';
import { timestampToMillis } from '../../utils/timestamp';

export function getDeviceDisplayName(device) {
  return device?.name ?? device?.deviceName ?? 'Thiết bị';
}

export function getPlatformLabel(platform) {
  if (platform === 'ios') {
    return 'iOS';
  }

  if (platform === 'android') {
    return 'Android';
  }

  return 'Không xác định';
}

export function formatTimestampValue(value) {
  const timestamp = timestampToMillis(value);
  return Number.isFinite(timestamp) ? formatDateTime(timestamp) : EMPTY_VALUE;
}

export function getAppVersionLabel(device) {
  return device?.appVersion ?? APP_VERSION;
}

export function getSessionStatusLabel(device) {
  if (device?.status === 'deleted') {
    return 'Đã xóa';
  }

  if (device?.sessionStatus === 'revoked') {
    return 'Đã đăng xuất';
  }

  return 'Đang hoạt động';
}

export function getSecurityActionLabel(action) {
  const labels = {
    add_device: 'Thêm thiết bị',
    change_password: 'Đổi mật khẩu',
    delete_device: 'Xóa thiết bị',
    kick_device: 'Đăng xuất thiết bị',
    login: 'Đăng nhập',
    logout: 'Đăng xuất',
    logout_all: 'Đăng xuất tất cả',
    rename_device: 'Đổi tên thiết bị',
    update_device_marker: 'Cập nhật màu marker thiết bị',
  };

  return labels[action] ?? 'Hoạt động tài khoản';
}
