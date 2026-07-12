export { auth, db } from './firebaseConfig';
export {
  changeCurrentUserPassword,
  getCurrentUser,
  loginWithEmail,
  logout,
  reauthenticateWithPassword,
  registerWithEmail,
  subscribeToAuthChanges,
} from './authService';
export {
  createUserProfile,
  ensureUserProfile,
  getUserProfile,
  updateUserProfile,
} from './userService';
export {
  createOrUpdateDevice,
  getDevice,
  listDevices,
  subscribeToDevices,
  updateDevice,
  updateDeviceStatus,
} from './deviceService';
export {
  listSecurityLogs,
  logSecurityEvent,
  revokeAllDeviceSessions,
  revokeDeviceSession,
  SECURITY_ACTIONS,
  softDeleteDevice,
  updateDevicePreferences,
  updateUserAccountProfile,
} from './accountSecurityService';
export {
  getLiveLocation,
  subscribeToLiveLocation,
  updateLiveLocation,
} from './liveLocationService';
export {
  createTripSummary,
  getTripSummary,
  listTripSummaries,
  updateTripSummary,
} from './tripSummaryService';
export {
  getCloudTripPlayback,
  getCloudTripSummary,
  listCloudTripGpsChunks,
  listCloudTripSummaries,
  uploadCompletedTrip,
  uploadTripGpsChunks,
  uploadTripSummary,
} from './tripHistoryCloudService';
