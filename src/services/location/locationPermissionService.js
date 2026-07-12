import * as Location from 'expo-location';

function normalizePermissionResponse(permission) {
  return {
    status: permission.status,
    granted: permission.granted || permission.status === 'granted',
    canAskAgain: permission.canAskAgain,
  };
}

export async function requestForegroundPermission() {
  const permission = await Location.requestForegroundPermissionsAsync();
  return normalizePermissionResponse(permission);
}

export async function checkForegroundPermission() {
  const permission = await Location.getForegroundPermissionsAsync();
  return normalizePermissionResponse(permission);
}

export async function checkBackgroundPermission() {
  const permission = await Location.getBackgroundPermissionsAsync();
  return normalizePermissionResponse(permission);
}

export async function requestBackgroundPermission() {
  const permission = await Location.requestBackgroundPermissionsAsync();
  return normalizePermissionResponse(permission);
}

export async function checkPermission() {
  return checkForegroundPermission();
}

export async function isLocationServiceEnabled() {
  return Location.hasServicesEnabledAsync();
}

export async function refreshPermissionStatus({ backgroundRequired = false } = {}) {
  const [foregroundPermission, servicesEnabled, backgroundPermission] =
    await Promise.all([
      checkForegroundPermission(),
      isLocationServiceEnabled(),
      backgroundRequired ? checkBackgroundPermission() : Promise.resolve(null),
    ]);

  return {
    foregroundPermission,
    servicesEnabled,
    backgroundPermission,
    backgroundRequired,
  };
}
