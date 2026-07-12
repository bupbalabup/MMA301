export function getTodayDateKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatTimestamp(timestamp) {
  if (!timestamp) {
    return '';
  }

  return new Date(timestamp).toLocaleString();
}
