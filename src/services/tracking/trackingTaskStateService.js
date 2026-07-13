import AsyncStorage from '@react-native-async-storage/async-storage';

const TRACKING_TASK_STATE_KEY = 'trackcam.trackingTask.state.v1';

function cloneJson(value) {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

export async function loadTrackingTaskState() {
  try {
    const rawValue = await AsyncStorage.getItem(TRACKING_TASK_STATE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return parsed;
  } catch (error) {
    if (__DEV__) {
      console.warn('[BG_PROCESSOR] Failed to read persisted tracking state.', error);
    }
    return null;
  }
}

export async function saveTrackingTaskState(snapshot) {
  try {
    await AsyncStorage.setItem(
      TRACKING_TASK_STATE_KEY,
      JSON.stringify({
        ...cloneJson(snapshot),
        persistedAt: Date.now(),
      })
    );
  } catch (error) {
    if (__DEV__) {
      console.warn('[BG_PROCESSOR] Failed to persist tracking state.', error);
    }
  }
}

export async function clearTrackingTaskState() {
  try {
    await AsyncStorage.removeItem(TRACKING_TASK_STATE_KEY);
  } catch (error) {
    if (__DEV__) {
      console.warn('[BG_PROCESSOR] Failed to clear persisted tracking state.', error);
    }
  }
}
