export function timestampToMillis(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isFinite(millis) ? millis : null;
  }

  if (typeof value === 'string') {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }

    const millis = Date.parse(value);
    return Number.isFinite(millis) ? millis : null;
  }

  if (typeof value.toMillis === 'function') {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : null;
  }

  if (Number.isFinite(value.seconds)) {
    return value.seconds * 1000;
  }

  return null;
}

export function getLatestTimestampMs(...values) {
  const timestamps = values
    .map(timestampToMillis)
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return Math.max(...timestamps);
}

export function normalizeLocationTimestamp(value, fallback = null) {
  const timestamp = timestampToMillis(value);

  if (!Number.isFinite(timestamp)) {
    return fallback;
  }

  // Expo normally provides milliseconds. Some providers/mocks may provide
  // seconds; convert only clearly second-scale epoch values.
  if (timestamp > 0 && timestamp < 100000000000) {
    return timestamp * 1000;
  }

  return timestamp;
}
