export function createId(prefix) {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);

  if (!prefix) {
    return `${timestamp}_${randomPart}`;
  }

  return `${prefix}_${timestamp}_${randomPart}`;
}
