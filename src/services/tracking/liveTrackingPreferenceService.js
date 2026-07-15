import AsyncStorage from '@react-native-async-storage/async-storage';

const LIVE_TRACKING_RICH_NOTIFICATION_KEY =
  'trackcam.liveTrackingNotification.richContent.v1';

export async function loadLiveTrackingNotificationPreference() {
  const storedValue = await AsyncStorage.getItem(
    LIVE_TRACKING_RICH_NOTIFICATION_KEY
  );

  if (storedValue == null) {
    return true;
  }

  return storedValue === 'true';
}

export async function saveLiveTrackingNotificationPreference(enabled) {
  const normalizedValue = enabled !== false;
  await AsyncStorage.setItem(
    LIVE_TRACKING_RICH_NOTIFICATION_KEY,
    String(normalizedValue)
  );
  return normalizedValue;
}
